// Persistence for the TeaserScreen conversation (see screens/TeaserScreen.tsx).
// Unrelated to api.ts: that file is the Pyodide-worker boundary, this is a real
// network call to the Vercel Functions under api/teaser-run/.

export function createTeaserRun(): Promise<{ id: number }> {
  return fetch('/api/teaser-run', { method: 'POST' }).then(r => {
    if (!r.ok) throw new Error(`create failed: ${r.status}`)
    return r.json()
  })
}

export function updateTeaserRun(id: number, patch: { opinion?: string; decisionLog?: unknown }): Promise<void> {
  return fetch(`/api/teaser-run/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  }).then(r => {
    if (!r.ok) throw new Error(`update failed: ${r.status}`)
  })
}
