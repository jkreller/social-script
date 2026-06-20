import { useCallback, useEffect, useRef, useState } from 'react'
import { addClip } from '../utils/recordingStore'

export type Facing = 'front' | 'back'

// localStorage flag, read by App on the next foreground/launch: a run was interrupted
// mid-recording and is awaiting the human's Resume/Finish choice. Written synchronously
// in the hide handler so it survives even when the async clip-save can't finish before
// iOS freezes the page.
export const PAUSED_KEY = 'paused'

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
 * Records one camera at a time (front by default, mic audio included). The active camera
 * is drawn into an offscreen canvas and the canvas stream is recorded, so switchCamera()
 * can swap the source without interrupting the recorder.
 *
 * A recording ends on a clean finish (stop()) OR the first interruption — lock, background,
 * notification pull, close (visibilitychange→hidden / pagehide). On interruption we finalize
 * a playable clip right away (iOS MP4 is only valid after a clean stop), append it to the
 * clip store, and flag the run paused via `onInterrupted` so the app can offer Resume
 * (records a fresh clip) or Finish. Each finalized clip is appended to recordingStore.
 * NOTE: getUserMedia needs HTTPS off localhost.
 */
export function useRecorder(enabled: boolean, onInterrupted?: () => void) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const cameraTrack = useRef<MediaStreamTrack | null>(null)
  const audioTrack = useRef<MediaStreamTrack | null>(null)
  const rafId = useRef<number>(0)
  const recorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const startedRef = useRef(false)
  const switchingRef = useRef(false)
  const wakeLock = useRef<WakeLockSentinel | null>(null)
  const detachListeners = useRef<() => void>(() => {})
  const onInterruptedRef = useRef(onInterrupted)
  onInterruptedRef.current = onInterrupted
  const [facing, setFacing] = useState<Facing>('front')

  // iOS suspends requestAnimationFrame — and with it the draw() loop that feeds the
  // recorder — when the screen dims or the page is hidden, freezing the picture while
  // audio keeps going. A screen wake lock keeps the display (and the render loop) alive
  // while recording; it's released the moment the recording ends. We don't re-acquire on
  // return, because any hide ends the recording (see interrupt). Best-effort: iOS < 16.4
  // and browsers without the API just go without.
  const acquireWakeLock = useCallback(async () => {
    if (document.visibilityState !== 'visible') return
    try { wakeLock.current = (await navigator.wakeLock?.request('screen')) ?? null }
    catch { /* denied or unsupported → no lock */ }
  }, [])

  // End the recording, save the clip, release everything. Idempotent: claims the recorder
  // ref synchronously so a second trigger (e.g. pagehide right after visibilitychange) is a
  // no-op. Used by both a clean finish and an interruption.
  const finalize = useCallback(async () => {
    cancelAnimationFrame(rafId.current)
    const rec = recorder.current
    recorder.current = null
    detachListeners.current()
    detachListeners.current = () => {}
    wakeLock.current?.release().catch(() => {})
    wakeLock.current = null
    let blob: Blob | null = null
    if (rec) {
      blob = await new Promise<Blob>(resolve => {
        rec.onstop = () => resolve(new Blob(chunks.current, { type: rec.mimeType || 'video/webm' }))
        if (rec.state !== 'inactive') rec.stop()
        else rec.onstop!(new Event('stop'))
      })
    }
    cameraTrack.current?.stop()
    audioTrack.current?.stop()
    if (blob && blob.size) { try { await addClip(blob) } catch { /* storage unavailable */ } }
  }, [])

  // Hidden/closed while recording: flag the run paused (sync, so it survives a kill), let
  // the app react, then finalize the current clip.
  const interrupt = useCallback(() => {
    if (!recorder.current) return
    try { localStorage.setItem(PAUSED_KEY, '1') } catch { /* ignore */ }
    onInterruptedRef.current?.()
    finalize()
  }, [finalize])

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

  // Acquire once. Teardown happens only via finalize() (not effect cleanup), so React
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
      acquireWakeLock()

      // Finalize on the first sign of leaving: visibilitychange→hidden (earliest, while JS
      // is still alive) with pagehide as a close/navigation backstop.
      const onVisibility = () => { if (document.visibilityState === 'hidden') interrupt() }
      document.addEventListener('visibilitychange', onVisibility)
      window.addEventListener('pagehide', interrupt)
      detachListeners.current = () => {
        document.removeEventListener('visibilitychange', onVisibility)
        window.removeEventListener('pagehide', interrupt)
      }
    })()
  }, [enabled, acquireWakeLock, interrupt])

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

  const stop = useCallback(() => finalize(), [finalize])

  return { videoRef, facing, switchCamera, stop }
}
