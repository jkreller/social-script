// Shared HTTP sync client.
// The video master POSTs the playback state; the code follower polls it.
// No WebSocket — every request is stateless, so reconnect/late-join is automatic.

export async function postState(patch) {
  try {
    await fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
  } catch { /* dropped; the next post supersedes it */ }
}

export function pollState(onState, ms = 250) {
  let lastRev = -1
  setInterval(async () => {
    try {
      const s = await (await fetch('/api/state')).json()
      if (s.rev !== lastRev) { lastRev = s.rev; onState(s) }
    } catch { /* dropped; retry next tick */ }
  }, ms)
}
