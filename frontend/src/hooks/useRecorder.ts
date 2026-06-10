import { useCallback, useEffect, useRef, useState } from 'react'

export type Facing = 'front' | 'back'

export interface Recording {
  url: string
  blob: Blob
}

// Prefer MP4/H.264 (plays natively in QuickTime, iMessage, editors); fall back to webm
// where MediaRecorder can't produce MP4 (Firefox). Empty string lets MediaRecorder pick.
function pickMime(): string {
  const types = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2', // H.264 baseline + AAC
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ]
  return types.find(t => MediaRecorder.isTypeSupported?.(t)) ?? ''
}

// Capped so a long run (~30 min) stays compact on phone storage while keeping
// documentation-grade quality. Tune VIDEO_BPS down to ~1_500_000 for smaller files.
const VIDEO_BPS = 2_000_000 // ~2 Mbps H.264 @ 720p
const AUDIO_BPS = 128_000   // 128 kbps AAC

/**
 * Records one camera at a time (front by default, mic audio included) for the whole run.
 * The active camera is drawn into an offscreen canvas and the canvas stream is recorded,
 * so switchCamera() can swap the source without ever interrupting the recorder — the
 * result is a single continuous file. NOTE: getUserMedia needs HTTPS off localhost.
 */
export function useRecorder(enabled: boolean) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const cameraTrack = useRef<MediaStreamTrack | null>(null)
  const audioTrack = useRef<MediaStreamTrack | null>(null)
  const rafId = useRef<number>(0)
  const recorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const startedRef = useRef(false)
  const switchingRef = useRef(false)
  const [facing, setFacing] = useState<Facing>('front')

  const openCamera = async (f: Facing) => {
    const s = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: f === 'front' ? 'user' : 'environment', width: { ideal: 1280 } },
    })
    return s.getVideoTracks()[0] ?? null
  }

  const showTrack = (track: MediaStreamTrack) => {
    const v = videoRef.current
    if (!v) return
    v.srcObject = new MediaStream([track])
    v.muted = true
    v.playsInline = true
    v.play().catch(() => {})
  }

  // Acquire once. Teardown happens only via stop() (not effect cleanup), so React
  // StrictMode's throwaway unmount can't kill the stream before recording starts.
  useEffect(() => {
    if (!enabled || startedRef.current) return
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) return
    startedRef.current = true

    ;(async () => {
      try {
        const a = await navigator.mediaDevices.getUserMedia({ audio: true })
        audioTrack.current = a.getAudioTracks()[0] ?? null
      } catch { /* no mic → video-only */ }

      let track: MediaStreamTrack | null = null
      try { track = await openCamera('front') } catch { /* handled below */ }
      if (!track) { audioTrack.current?.stop(); return }
      cameraTrack.current = track
      showTrack(track)

      // Wait for the decoded frame size before sizing the canvas. getSettings() is
      // unreliable on iOS Safari (reports the sensor's landscape orientation even when
      // frames are portrait), which squeezes the recording; videoWidth/videoHeight is
      // the true frame and drawImage then fills the canvas 1:1.
      const v0 = videoRef.current
      if (v0 && !(v0.videoWidth && v0.videoHeight)) {
        await new Promise<void>(resolve =>
          v0.addEventListener('loadedmetadata', () => resolve(), { once: true }))
      }

      const canvas = document.createElement('canvas')
      canvasRef.current = canvas
      const ctx = canvas.getContext('2d')!
      // Size the canvas to the true decoded frame BEFORE captureStream() so the recorder
      // locks in the correct (portrait or landscape) aspect ratio, not the 300×150 default.
      const v = videoRef.current
      if (v?.videoWidth && v.videoHeight) {
        canvas.width = v.videoWidth; canvas.height = v.videoHeight
      } else {
        // Fallback only if the element never reported a frame size.
        const s0 = track.getSettings()
        if (s0.width && s0.height) { canvas.width = s0.width; canvas.height = s0.height }
      }
      const draw = () => {
        const v = videoRef.current
        if (v && v.readyState >= 2) {
          if (canvas.width !== v.videoWidth) { canvas.width = v.videoWidth; canvas.height = v.videoHeight }
          ctx.drawImage(v, 0, 0, canvas.width, canvas.height)
        }
        rafId.current = requestAnimationFrame(draw)
      }
      draw()

      const out = canvas.captureStream()
      if (audioTrack.current) out.addTrack(audioTrack.current)
      const mime = pickMime()
      const rec = new MediaRecorder(out, {
        ...(mime ? { mimeType: mime } : {}),
        videoBitsPerSecond: VIDEO_BPS,
        audioBitsPerSecond: AUDIO_BPS,
      })
      rec.ondataavailable = e => { if (e.data.size) chunks.current.push(e.data) }
      rec.start()
      recorder.current = rec
    })()
  }, [enabled])

  const switchCamera = useCallback(async () => {
    if (switchingRef.current || !cameraTrack.current) return
    switchingRef.current = true
    const next: Facing = facing === 'front' ? 'back' : 'front'
    try {
      const track = await openCamera(next) // acquire before stopping the old one
      if (track) {
        cameraTrack.current?.stop()
        cameraTrack.current = track
        showTrack(track)
        setFacing(next)
      }
    } catch { /* acquisition failed → stay on current camera */ }
    switchingRef.current = false
  }, [facing])

  const stop = useCallback(async (): Promise<Recording | null> => {
    cancelAnimationFrame(rafId.current)
    const rec = recorder.current
    const out = rec ? await new Promise<Recording>(resolve => {
      rec.onstop = () => {
        const blob = new Blob(chunks.current, { type: rec.mimeType || 'video/webm' })
        resolve({ url: URL.createObjectURL(blob), blob })
      }
      if (rec.state !== 'inactive') rec.stop()
      else rec.onstop!(new Event('stop'))
    }) : null
    cameraTrack.current?.stop()
    audioTrack.current?.stop()
    recorder.current = null
    return out
  }, [])

  return { videoRef, facing, switchCamera, stop }
}
