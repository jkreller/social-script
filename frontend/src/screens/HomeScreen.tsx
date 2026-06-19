import { useEffect, useState } from 'react'
import { getScripts, type ScriptInfo } from '../api'
import btn from '../styles/buttons.module.css'
import styles from './HomeScreen.module.css'

function formatName(s: string): string {
  return s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

interface Props {
  onPick: (script: string, version: string, tags: string[], userName: string, cameraOn: boolean) => void
}

export default function HomeScreen({ onPick }: Props) {
  const [scripts, setScripts] = useState<ScriptInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userName, setUserName] = useState('')
  const [camera, setCamera] = useState(true)
  const [pendingScript, setPendingScript] = useState<ScriptInfo | null>(null)

  useEffect(() => {
    getScripts()
      .then(setScripts)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  const closeModal = () => {
    setPendingScript(null)
    setUserName('')
    setCamera(true)
  }

  const confirmStart = () => {
    if (pendingScript && userName.trim()) {
      onPick(pendingScript.name, pendingScript.version, pendingScript.tags, userName.trim(), camera)
    }
  }

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
          {scripts.map(script => {
            const { name, version, tags } = script
            return (
            <div
              key={name}
              className={styles.item}
              role="button"
              onClick={() => setPendingScript(script)}
            >
              <div className={styles.itemHead}>
                <span className={styles.itemName}>{formatName(name)}</span>
                {version && <span className={styles.version}>{version}</span>}
              </div>
              {tags.length > 0 && (
                <div className={styles.tags}>
                  {tags.map(tag => (
                    <span key={tag} className={styles.tag}>{tag}</span>
                  ))}
                </div>
              )}
            </div>
            )
          })}
        </div>
      )}

      {pendingScript !== null && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <span className={styles.modalLabel}>your name</span>
            <input
              className={styles.nameInput}
              type="text"
              placeholder="enter name"
              value={userName}
              autoFocus
              maxLength={80}
              onChange={e => setUserName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') confirmStart() }}
            />
            <label className={styles.cameraToggle}>
              <input type="checkbox" checked={camera} onChange={e => setCamera(e.target.checked)} />
              <span>record video</span>
            </label>
            <button
              className={`${btn.btnSecondary} ${styles.confirmBtn}`}
              disabled={!userName.trim()}
              onClick={confirmStart}
            >
              Start
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
