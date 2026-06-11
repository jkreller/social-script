// Offline script engine — runs on its own thread (a Web Worker), so loading the
// ~13 MB interpreter and running Python never freezes the UI. It runs the real
// `social_script` package + scripts in Pyodide (CPython compiled to WASM),
// mirroring the stateless `(script, answers) -> next prompt` replay logic.
import { loadPyodide, type PyodideInterface } from 'pyodide'
import runtimeSrc from './runtime.py?raw'

// Pull the Python sources straight from the canonical repo dirs at build time:
// `?raw` inlines each file's text into the bundle as a string, keyed by path —
// no second copy of the package is kept, and it ships inside the precached JS.
const pySources = {
  ...import.meta.glob('../../../social_script/**/*.py', { query: '?raw', eager: true, import: 'default' }),
  ...import.meta.glob('../../../scripts/**/*.py', { query: '?raw', eager: true, import: 'default' }),
} as Record<string, string>

// One-time startup (kicked off on worker load): boot the interpreter from the
// precached runtime under /pyodide/, recreate the package files inside its
// in-memory filesystem, then define the entry points. `ready` resolves once the
// interpreter can accept calls; every request awaits it.
let py: PyodideInterface
const ready = (async () => {
  py = await loadPyodide({ indexURL: '/pyodide/' })
  for (const [path, src] of Object.entries(pySources)) {
    const rel = path.replace(/^(\.\.\/)+/, '') // -> social_script/actions.py, scripts/connect_group.py
    const dir = rel.split('/').slice(0, -1).join('/')
    if (dir) py.FS.mkdirTree(dir)
    py.FS.writeFile(rel, src)
  }
  py.runPython(runtimeSrc)
})()

// `self` in a worker is the global scope; cast it to the message API we use.
const ctx = self as unknown as {
  onmessage: ((e: MessageEvent) => void) | null
  postMessage: (m: unknown) => void
}

// The only entry point from the main thread: look up the named Python function,
// call it with the given args, and post the result (or error) back with the id
// so api.ts can match it to the right pending request.
ctx.onmessage = async (e: MessageEvent) => {
  const { id, fn, args } = e.data as { id: number; fn: string; args: string[] }
  try {
    await ready
    ctx.postMessage({ id, result: py.globals.get(fn)(...args) as string })
  } catch (err) {
    ctx.postMessage({ id, error: err instanceof Error ? err.message : String(err) })
  }
}
