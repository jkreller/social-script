// Durable store for finished video clips, so footage survives an interruption (lock,
// background, close) or an iOS kill of the backgrounded PWA. A run can produce several
// clips — one per interruption — kept in insertion order. Blobs are stored natively in
// IndexedDB; localStorage can't hold multi-MB video. All calls open/close their own
// connection (low frequency) to keep this dependency-free and simple.

const DB = 'social-script'
const STORE = 'clips'

function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('no indexedDB')); return }
    const open = indexedDB.open(DB, 1)
    open.onupgradeneeded = () => open.result.createObjectStore(STORE, { autoIncrement: true })
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const db = open.result
      const tx = db.transaction(STORE, mode)
      const req = run(tx.objectStore(STORE))
      tx.oncomplete = () => { resolve(req.result); db.close() }
      tx.onerror = () => { reject(tx.error); db.close() }
    }
  })
}

/** Append one finished clip. */
export const addClip = (blob: Blob): Promise<void> =>
  withStore('readwrite', s => s.add(blob)).then(() => {})

/** All saved clips for the current run, in the order they were recorded. */
export const getClips = (): Promise<Blob[]> =>
  withStore<Blob[]>('readonly', s => s.getAll())

/** Drop every clip (call when a run ends and the user leaves, or a new run starts). */
export const clearClips = (): Promise<void> =>
  withStore('readwrite', s => s.clear()).then(() => {})
