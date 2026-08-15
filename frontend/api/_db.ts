import { drizzle } from 'drizzle-orm/neon-http'
import { teaserRuns } from '../src/db/schema.js'

export const db = drizzle(process.env.DATABASE_URL!)
export { teaserRuns }
