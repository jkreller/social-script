import { pgTable, serial, text, jsonb, timestamp } from 'drizzle-orm/pg-core'

// One row per TeaserScreen run (see screens/TeaserScreen.tsx). Created the moment
// the screen opens (so we can count visits even if the visitor never answers
// anything), opinion/decisionLog patched in as the conversation progresses.
export const teaserRuns = pgTable('teaser_runs', {
  id: serial('id').primaryKey(),
  opinion: text('opinion'),
  decisionLog: jsonb('decision_log').notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
