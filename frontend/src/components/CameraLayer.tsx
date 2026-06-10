import type { RefObject } from 'react'
import styles from './CameraLayer.module.css'

interface Props {
  videoRef: RefObject<HTMLVideoElement>
}

// Faint full-screen preview of the active camera, behind the running UI.
export default function CameraLayer({ videoRef }: Props) {
  return (
    <div className={styles.layer} aria-hidden>
      <video ref={videoRef} className={styles.video} muted playsInline />
    </div>
  )
}
