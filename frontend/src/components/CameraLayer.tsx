import type { RefObject } from 'react'
import styles from './CameraLayer.module.css'

interface Props {
  frontRef: RefObject<HTMLVideoElement>
  backRef: RefObject<HTMLVideoElement>
}

// Faint live camera feeds behind the running UI — front on top, back on bottom.
// A camera that isn't live just renders an empty (invisible) video.
export default function CameraLayer({ frontRef, backRef }: Props) {
  return (
    <div className={styles.layer} aria-hidden>
      <video ref={frontRef} className={styles.half} muted playsInline />
      <video ref={backRef} className={styles.half} muted playsInline />
    </div>
  )
}
