import { query } from '../models/db.js'
import { redis } from '../config/redis.js'

async function downgradeExpiredUsers() {
  console.log('[Cron] Starting subscription expiry check...')

  try {
    const now = new Date().toISOString()

    const expiredUsers = await query(
      `SELECT id, phone, member_level FROM users
       WHERE member_level != 'free'
       AND member_expire_at IS NOT NULL
       AND member_expire_at < ?`,
      [now]
    )

    if (expiredUsers.length === 0) {
      console.log('[Cron] No expired subscriptions found')
      return
    }

    console.log(`[Cron] Found ${expiredUsers.length} expired subscriptions`)

    for (const user of expiredUsers) {
      await query(
        `UPDATE users SET member_level = 'free', member_expire_at = NULL WHERE id = ?`,
        [user.id]
      )

      await redis.del(`quota:free:${user.id}:*`)
      await redis.del(`quota:starter:${user.id}:*`)
      await redis.del(`quota:pro:${user.id}:*`)

      console.log(`[Cron] Downgraded user ${user.id} (${user.phone}) from ${user.member_level} to free`)
    }

    console.log(`[Cron] Successfully downgraded ${expiredUsers.length} users`)
  } catch (error) {
    console.error('[Cron] Error during downgrade:', error)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  downgradeExpiredUsers()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
}

export { downgradeExpiredUsers }
