import type { VercelRequest, VercelResponse } from '@vercel/node'
import { eq } from 'drizzle-orm'
import { createUpdateSchema } from 'drizzle-zod'
import { z } from 'zod'
import { db, teaserRuns } from '../_db.js'

// `decisionLog` is jsonb — the DB has no shape for it, so the array/entry shape
// is supplied here rather than derived; `.max(...)` caps are business rules on
// top of that, same reasoning as the opinion length cap in ../teaser-run/index.ts.
const decisionLogEntry = z.object({ step: z.string(), value: z.string().max(2000) })
const updateSchema = createUpdateSchema(teaserRuns, {
  decisionLog: z.array(decisionLogEntry).max(50),
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PATCH') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const id = Number(req.query.id)
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: 'Invalid id' })
    return
  }

  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: z.flattenError(parsed.error) })
    return
  }

  try {
    // Only decisionLog is ever patched here, even though the derived schema
    // would technically accept the rest of the row's fields too.
    await db.update(teaserRuns).set({ decisionLog: parsed.data.decisionLog }).where(eq(teaserRuns.id, id))
    res.status(204).end()
  } catch (err) {
    console.error('Failed to update teaser run', err)
    res.status(500).json({ error: 'Failed to save' })
  }
}
