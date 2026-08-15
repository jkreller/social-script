import { pgTable, serial, text, jsonb, timestamp } from 'drizzle-orm/pg-core'

// One row per TeaserScreen run (see screens/TeaserScreen.tsx). Created right after
// the opinion answer (so we still capture drop-offs), decisionLog filled in once
// the run reaches a terminal step.
export const teaserRuns = pgTable('teaser_runs', {
  id: serial('id').primaryKey(),
  opinion: text('opinion').notNull(),
  decisionLog: jsonb('decision_log').notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
