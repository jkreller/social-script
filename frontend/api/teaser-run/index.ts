import type { VercelRequest, VercelResponse } from '@vercel/node'
import { db, teaserRuns } from '../_db.js'

// Called with no body as soon as TeaserScreen mounts, purely to count a visit —
// opinion/decisionLog are patched in later via [id].ts as the conversation unfolds.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const [row] = await db.insert(teaserRuns).values({}).returning({ id: teaserRuns.id })
    res.status(201).json({ id: row.id })
  } catch (err) {
    console.error('Failed to create teaser run', err)
    res.status(500).json({ error: 'Failed to save' })
  }
}
