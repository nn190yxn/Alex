// Database migration: Add analytics_events table

import { query } from '../models/db.js'
import { ANALYTICS_SCHEMA } from '../services/analytics.js'

async function runMigration() {
  console.log('[Migration] Running analytics_events table migration...')

  try {
    // Create analytics_events table
    await query(ANALYTICS_SCHEMA)
    console.log('[Migration] analytics_events table created successfully')

    // Add indexes to existing tables if not present
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_tool_usage_user_date ON tool_usage(user_id, tool_code, DATE(created_at))',
      'CREATE INDEX IF NOT EXISTS idx_tool_results_user_code ON tool_results(user_id, tool_code, created_at)',
      'CREATE INDEX IF NOT EXISTS idx_users_member_level ON users(member_level, status)'
    ]

    for (const sql of indexes) {
      try {
        await query(sql)
        console.log(`[Migration] Index created: ${sql}`)
      } catch (err) {
        console.log(`[Migration] Index already exists or skipped: ${err.message}`)
      }
    }

    console.log('[Migration] All migrations completed')
  } catch (err) {
    console.error('[Migration] Failed:', err.message)
    process.exit(1)
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration()
}

export { runMigration }
