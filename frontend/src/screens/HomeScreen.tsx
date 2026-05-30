import { useEffect, useState } from 'react'
import { getScripts } from '../api'
import styles from './HomeScreen.module.css'

function formatName(s: string): string {
  return s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

interface Props {
  onPick: (script: string) => void
}

export default function HomeScreen({ onPick }: Props) {
  const [scripts, setScripts] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getScripts()
      .then(setScripts)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <span className={styles.title}>Select Script</span>
      </div>

      {loading && (
        <div className={styles.center}>
          <span className={styles.statusText}>loading…</span>
        </div>
      )}

      {error && (
        <div className={styles.center}>
          <span className={styles.errorText}>{error}</span>
        </div>
      )}

      {!loading && !error && (
        <div className={styles.list}>
          {scripts.map(name => (
            <div
              key={name}
              className={styles.item}
              role="button"
              onPointerDown={() => onPick(name)}
            >
              <span className={styles.itemName}>{formatName(name)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
