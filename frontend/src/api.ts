import type { ExceptionType, StepRequest, StepResponse } from './types'

const API = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000'

export async function getScripts(): Promise<string[]> {
  const res = await fetch(`${API}/scripts`)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

export async function getExceptions(): Promise<ExceptionType[]> {
  const res = await fetch(`${API}/exceptions`)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

export async function postStep(body: StepRequest, signal?: AbortSignal): Promise<StepResponse> {
  const res = await fetch(`${API}/step`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}
