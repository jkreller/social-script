import { useCallback, useEffect, useRef } from 'react'
import { addClip } from '../utils/recordingStore'

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
 * Records the front camera + mic for the whole run by recording the getUserMedia
 * MediaStream **directly**. We deliberately do NOT route through an offscreen canvas:
 * canvas.captureStream() + MediaRecorder is unreliable on iOS (it freezes the picture
 * after ~15s and can emit black / unseekable / wrong-duration files — WebKit bugs 229611,
 * 216832, 181663). Recording the track directly is immune to that, since MediaRecorder
 * pulls frames straight from the camera regardless of page rendering.
 *
 * A recording ends on a clean finish (stop()) OR the first interruption — lock, background,
 * notification pull, close (visibilitychange→hidden / pagehide) — finalizing a playable clip
 * and flagging the run paused via `onInterrupted` so the app can offer Resume (a fresh clip)
 * or Finish. Each finalized clip is appended to recordingStore. NOTE: getUserMedia needs
 * HTTPS off localhost.
 */
export function useRecorder(enabled: boolean, onInterrupted?: () => void) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const cameraTrack = useRef<MediaStreamTrack | null>(null)
  const audioTrack = useRef<MediaStreamTrack | null>(null)
  const recorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const startedRef = useRef(false)
  const wakeLock = useRef<WakeLockSentinel | null>(null)
  const detachListeners = useRef<() => void>(() => {})
  const onInterruptedRef = useRef(onInterrupted)
  onInterruptedRef.current = onInterrupted

  // iOS suspends background timers and can throttle the page, and locking the screen hides
  // it (→ finalize). A screen wake lock keeps the display awake while recording so the run
  // isn't needlessly split into clips. Released the moment the recording ends. Best-effort:
  // iOS < 16.4 and browsers without the API just go without.
  const acquireWakeLock = useCallback(async () => {
    if (document.visibilityState !== 'visible') return
    try { wakeLock.current = (await navigator.wakeLock?.request('screen')) ?? null }
    catch { /* denied or unsupported → no lock */ }
  }, [])

  // End the recording, save the clip, release everything. Idempotent: claims the recorder
  // ref synchronously so a second trigger (e.g. pagehide right after visibilitychange) is a
  // no-op. Used by both a clean finish and an interruption.
  const finalize = useCallback(async () => {
    const rec = recorder.current
    recorder.current = null
    detachListeners.current()
    detachListeners.current = () => {}
    wakeLock.current?.release().catch(() => {})
    wakeLock.current = null
    let blob: Blob | null = null
    if (rec) {
      blob = await new Promise<Blob>(resolve => {
        const done = () => resolve(new Blob(chunks.current, { type: rec.mimeType || 'video/webm' }))
        rec.onstop = done
        if (rec.state !== 'inactive') {
          rec.stop()
          // iOS sometimes never fires onstop; fall back to the buffered chunks so a finish
          // (or interruption) can't hang forever.
          setTimeout(done, 1500)
        } else done()
      })
    }
    cameraTrack.current?.stop()
    audioTrack.current?.stop()
    cameraTrack.current = null
    audioTrack.current = null
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

      let camera: MediaStream | null = null
      try {
        camera = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 } },
        })
      } catch { /* handled below */ }
      const track = camera?.getVideoTracks()[0] ?? null
      if (!track) { audioTrack.current?.stop(); audioTrack.current = null; return }
      cameraTrack.current = track

      // Record the camera+mic stream directly; show it as the faint preview too.
      const stream = new MediaStream([track, audioTrack.current].filter(Boolean) as MediaStreamTrack[])
      const v = videoRef.current
      if (v) { v.srcObject = stream; v.muted = true; v.playsInline = true; v.play().catch(() => {}) }

      const mime = pickMime()
      const rec = new MediaRecorder(stream, {
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

  const stop = useCallback(() => finalize(), [finalize])

  return { videoRef, stop }
}
