import express from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { query } from '../models/db.js'
import { getToolUsageStats, getConversionFunnel, getToolSuccessRate } from '../services/analytics.js'
import { logger } from '../middleware/logger.js'

const router = express.Router()

async function adminOnly(req, res, next) {
  try {
    const users = await query('SELECT member_level FROM users WHERE id = ?', [req.user.userId])
    const memberLevel = users[0]?.member_level || 'free'

    if (memberLevel !== 'annual') {
      return res.status(403).json({ message: '无运营后台访问权限' })
    }

    next()
  } catch (error) {
    logger.error('admin', 'Admin permission check failed', { error: error.message, userId: req.user?.userId })
    res.status(500).json({ message: '权限校验失败' })
  }
}

router.use(authMiddleware, adminOnly)

router.get('/stats', async (req, res) => {
  try {
    const users = await query('SELECT member_level FROM users')
    const orders = await query('SELECT status, amount FROM orders')

    const totalUsers = users.length
    const paidUsers = users.filter(u => ['starter', 'pro', 'annual'].includes(u.member_level)).length
    const totalOrders = orders.length
    const totalRevenue = orders
      .filter(o => o.status === 'paid')
      .reduce((sum, o) => sum + (o.amount || 0), 0)

    res.json({
      totalUsers,
      paidUsers,
      totalOrders,
      totalRevenue: totalRevenue.toFixed(2)
    })
  } catch (error) {
    logger.error('admin', 'Stats error', { error: error.message })
    res.status(500).json({ message: '获取统计数据失败' })
  }
})

router.get('/analytics', async (req, res) => {
  try {
    const { days = 7 } = req.query
    const [toolStats, funnel] = await Promise.all([
      getToolUsageStats(parseInt(days)),
      getConversionFunnel(parseInt(days))
    ])
    res.json({ toolStats, funnel })
  } catch (error) {
    logger.error('admin', 'Analytics error', { error: error.message })
    res.status(500).json({ message: '获取分析数据失败' })
  }
})

router.get('/analytics/tool/:toolCode', async (req, res) => {
  try {
    const { toolCode } = req.params
    const { days = 7 } = req.query
    const stats = await getToolSuccessRate(toolCode, parseInt(days))
    res.json(stats || { message: '暂无数据' })
  } catch (error) {
    logger.error('admin', 'Tool analytics error', { error: error.message })
    res.status(500).json({ message: '获取工具分析数据失败' })
  }
})

router.get('/users', async (req, res) => {
  try {
    const users = await query(
      'SELECT id, phone, nickname, member_level, member_expire_at, created_at, referred_by FROM users ORDER BY id DESC'
    )
    res.json(users)
  } catch (error) {
    logger.error('admin', 'Users error', { error: error.message })
    res.status(500).json({ message: '获取用户列表失败' })
  }
})

router.get('/orders', async (req, res) => {
  try {
    const orders = await query(`
      SELECT o.id, o.user_id, o.plan_code, o.amount, o.status, o.created_at,
             u.phone
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.id DESC
      LIMIT 100
    `)
    res.json(orders)
  } catch (error) {
    logger.error('admin', 'Orders error', { error: error.message })
    res.status(500).json({ message: '获取订单列表失败' })
  }
})

router.get('/tool-usage', async (req, res) => {
  try {
    const usage = await query(`
      SELECT tool_code, COUNT(*) as total,
             SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) as today
      FROM tool_usage
      GROUP BY tool_code
    `)

    const result = usage.map(u => [u.tool_code, {
      total: u.total,
      today: u.today
    }])

    res.json(result)
  } catch (error) {
    logger.error('admin', 'Tool usage error', { error: error.message })
    res.status(500).json({ message: '获取工具使用统计失败' })
  }
})

export default router
