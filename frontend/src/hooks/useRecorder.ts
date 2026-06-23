import { useCallback, useEffect, useRef } from 'react'
import { addClip } from '../utils/recordingStore'

// localStorage flag, read by App on the next foreground/launch: a run was interrupted
// mid-recording and is awaiting the human's Resume/Finish choice. Written synchronously
// in the hide handler so it survives even when the async clip-save can't finish before
// iOS freezes the page.
export const PAUSED_KEY = 'paused'

// How often MediaRecorder flushes a chunk. This is NOT just for periodic saving: on iOS,
// recording audio+video without a timeslice stalls the *video* track after ~15s (the picture
// freezes while audio keeps going). Starting with a timeslice keeps the encoder pipeline alive
// so the video records for the whole run. Verified on-device (iOS 26.5). Bonus: chunks are
// already flushed every second, so an interruption/kill loses at most ~1s of footage.
const TIMESLICE_MS = 1000

/**
 * Records the front camera + mic for the whole run by recording one combined getUserMedia
 * MediaStream directly (no offscreen canvas, no forced codec/bitrate — letting iOS pick its
 * native mp4/H.264/AAC). The recorder is started with a timeslice; see TIMESLICE_MS for why
 * that's load-bearing on iOS.
 *
 * A recording ends on a clean finish (stop()) OR the first interruption — lock, background,
 * notification pull, close (visibilitychange→hidden / pagehide) — finalizing a playable clip
 * and flagging the run paused via `onInterrupted` so the app can offer Resume (a fresh clip)
 * or Finish. Each finalized clip is appended to recordingStore. NOTE: getUserMedia needs
 * HTTPS off localhost.
 */
export function useRecorder(
  enabled: boolean,
  onInterrupted?: () => void,
  onReady?: (timestamp: number) => void,
  onClipEnd?: (timestamp: number) => void,
) {
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
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady
  const onClipEndRef = useRef(onClipEnd)
  onClipEndRef.current = onClipEnd

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
    onClipEndRef.current?.(Date.now())
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
      // One combined stream (front camera + mic). On iOS, two separate getUserMedia streams
      // are an instability source; a single stream is the recommended pattern.
      const constraints = { facingMode: 'user', width: { ideal: 1280 } }
      let stream: MediaStream | null = null
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: constraints,
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        })
      } catch {
        // Mic denied/unavailable → fall back to video-only so a no-mic device still records.
        try { stream = await navigator.mediaDevices.getUserMedia({ video: constraints }) }
        catch { return /* no camera */ }
      }
      const track = stream.getVideoTracks()[0] ?? null
      if (!track) { stream.getTracks().forEach(t => t.stop()); return }
      cameraTrack.current = track
      audioTrack.current = stream.getAudioTracks()[0] ?? null

      // Show the same stream as the faint preview.
      const v = videoRef.current
      if (v) { v.srcObject = stream; v.muted = true; v.playsInline = true; v.play().catch(() => {}) }

      // No forced mimeType — iOS picks mp4/H.264/AAC. Bitrate caps keep clips shareable
      // (~192 MB/5 min vs the ~350 MB browser default) without touching resolution.
      // The timeslice is what keeps the video track from stalling on iOS (see TIMESLICE_MS).
      const rec = new MediaRecorder(stream, {
        videoBitsPerSecond: 5_000_000,
        audioBitsPerSecond: 128_000,
      })
      rec.ondataavailable = e => { if (e.data.size) chunks.current.push(e.data) }
      rec.start(TIMESLICE_MS)
      onReadyRef.current?.(Date.now())
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
