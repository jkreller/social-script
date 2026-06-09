import { useCallback, useEffect, useRef } from 'react'

export interface Recording {
  facing: 'front' | 'back'
  url: string
  blob: Blob
}

// Prefer webm; fall back to mp4 for Safari. Empty string lets MediaRecorder pick.
function pickMime(): string {
  const types = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
  return types.find(t => MediaRecorder.isTypeSupported?.(t)) ?? ''
}

interface Rec {
  facing: 'front' | 'back'
  recorder: MediaRecorder
  chunks: Blob[]
}

/**
 * Records the front and/or back camera (with mic audio) for the lifetime of a run.
 * Graceful fallback: most phones only allow one camera live at a time — opening the
 * back camera ends the front track — so we record whichever tracks stay `live`.
 * NOTE: getUserMedia needs HTTPS off localhost, or it throws silently.
 */
export function useRecorder(enabled: boolean) {
  const frontVideo = useRef<HTMLVideoElement>(null)
  const backVideo = useRef<HTMLVideoElement>(null)
  const tracksRef = useRef<MediaStreamTrack[]>([])
  const recsRef = useRef<Rec[]>([])
  const startedRef = useRef(false)

  const attach = (el: HTMLVideoElement | null, track: MediaStreamTrack) => {
    if (!el) return
    el.srcObject = new MediaStream([track])
    el.muted = true
    el.playsInline = true
    el.play().catch(() => {})
  }

  // Acquire once. Teardown happens only via stop() (not effect cleanup), so React
  // StrictMode's throwaway unmount can't kill the stream before recording starts.
  useEffect(() => {
    if (!enabled || startedRef.current) return
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) return
    startedRef.current = true

    ;(async () => {
      const mime = pickMime()

      let audio: MediaStreamTrack | null = null
      try {
        const a = await navigator.mediaDevices.getUserMedia({ audio: true })
        audio = a.getAudioTracks()[0] ?? null
      } catch { /* no mic → video-only */ }

      const open = async (facing: 'front' | 'back') => {
        try {
          const s = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facing === 'front' ? 'user' : 'environment' },
          })
          return s.getVideoTracks()[0] ?? null
        } catch { return null }
      }
      const front = await open('front')
      const back = await open('back') // may preempt `front` on single-camera devices

      tracksRef.current = [audio, front, back].filter(Boolean) as MediaStreamTrack[]

      // Keep only cameras the OS actually left running.
      const live: { facing: 'front' | 'back'; track: MediaStreamTrack }[] = []
      if (front?.readyState === 'live') live.push({ facing: 'front', track: front })
      if (back?.readyState === 'live') live.push({ facing: 'back', track: back })

      if (live.length === 0) { audio?.stop(); return }

      for (const { facing, track } of live) {
        attach(facing === 'front' ? frontVideo.current : backVideo.current, track)
        const recorder = new MediaRecorder(
          new MediaStream(audio ? [track, audio] : [track]),
          mime ? { mimeType: mime } : undefined,
        )
        const rec: Rec = { facing, recorder, chunks: [] }
        recorder.ondataavailable = e => { if (e.data.size) rec.chunks.push(e.data) }
        recorder.start()
        recsRef.current.push(rec)
      }
    })()
  }, [enabled])

  const stop = useCallback(async (): Promise<Recording[]> => {
    const out = await Promise.all(recsRef.current.map(r => new Promise<Recording>(resolve => {
      r.recorder.onstop = () => {
        const blob = new Blob(r.chunks, { type: r.recorder.mimeType || 'video/webm' })
        resolve({ facing: r.facing, url: URL.createObjectURL(blob), blob })
      }
      if (r.recorder.state !== 'inactive') r.recorder.stop()
      else r.recorder.onstop!(new Event('stop'))
    })))
    tracksRef.current.forEach(t => t.stop())
    tracksRef.current = []
    recsRef.current = []
    return out
  }, [])

  return { frontVideo, backVideo, stop }
}
