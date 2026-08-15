import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createInsertSchema } from 'drizzle-zod'
import { z } from 'zod'
import { db, teaserRuns } from '../_db.js'

// Derived from the table so this can't silently drift from the DB shape; only
// `.max(5000)` is a business rule the column type doesn't already express.
const insertSchema = createInsertSchema(teaserRuns, {
  opinion: z.string().trim().min(1).max(5000),
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const parsed = insertSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: z.flattenError(parsed.error) })
    return
  }

  try {
    // decisionLog/id/createdAt are DB-owned — take only opinion from the parsed body,
    // even though the derived schema would technically accept the rest too.
    const [row] = await db.insert(teaserRuns).values({ opinion: parsed.data.opinion }).returning({ id: teaserRuns.id })
    res.status(201).json({ id: row.id })
  } catch (err) {
    console.error('Failed to create teaser run', err)
    res.status(500).json({ error: 'Failed to save' })
  }
}
