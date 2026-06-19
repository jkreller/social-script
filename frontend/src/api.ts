import type { ExceptionType, StepRequest, StepResponse } from './types'

// These three functions used to `fetch()` the FastAPI backend. They now run the
// exact same Python entirely on the client, inside a Pyodide Web Worker (see
// engine/worker.ts), so the app works fully offline. The signatures are
// unchanged, so the rest of the app (App.tsx, RunnerScreen) is none the wiser.
const worker = new Worker(new URL('./engine/worker.ts', import.meta.url), { type: 'module' })

// A worker talks only via postMessage, which is fire-and-forget — there is no
// return value. So we tag each request with an incrementing id, park its
// promise in `pending`, and resolve it when a reply carrying that same id
// arrives. This turns message-passing back into plain async/await for callers.
let seq = 0
const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>()

worker.onmessage = (e: MessageEvent) => {
  const { id, result, error } = e.data as { id: number; result?: string; error?: string }
  const p = pending.get(id)
  if (!p) return
  pending.delete(id)
  if (error) p.reject(new Error(error))
  else p.resolve(JSON.parse(result!)) // worker replies are JSON strings (see RUNTIME in worker.ts)
}

// Invoke a Python function in the worker by name and await its decoded result.
function call<T>(fn: string, ...args: string[]): Promise<T> {
  const id = ++seq
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve: resolve as (v: unknown) => void, reject })
    worker.postMessage({ id, fn, args })
  })
}

export interface ScriptInfo {
  name: string
  version: string
  tags: string[]
}

export function getScripts(): Promise<ScriptInfo[]> {
  return call('list_scripts')
}

export function getExceptions(): Promise<ExceptionType[]> {
  return call('list_exceptions')
}

// `_signal` is kept for signature compatibility but ignored: a worker step is a
// fresh, microsecond-fast replay, so there is nothing to abort. RunnerScreen
// still discards stale responses via its own AbortController check.
export async function postStep(body: StepRequest, _signal?: AbortSignal): Promise<StepResponse> {
  const r = await call<Partial<StepResponse>>('step', body.script, JSON.stringify(body.answers))
  return { prompt: r.prompt ?? null, done: r.done ?? false, error: r.error ?? null, exception: r.exception ?? null }
}
