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

    // 统一返回对象格式，而非数组格式
    const result = {}
    for (const u of usage) {
      result[u.tool_code] = {
        total: u.total,
        today: u.today
      }
    }

    res.json(result)
  } catch (error) {
    logger.error('admin', 'Tool usage error', { error: error.message })
    res.status(500).json({ message: '获取工具使用统计失败' })
  }
})

// === 返利管理 ===
router.get('/commissions', async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query
    const pageNum = Math.max(1, parseInt(page) || 1)
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50))
    const offset = (pageNum - 1) * limitNum

    let where = ''
    const params = []
    if (status) {
      where = 'WHERE rc.status = ?'
      params.push(status)
    }

    const rows = await query(`
      SELECT rc.id, rc.referrer_id, rc.referred_id, rc.order_id, rc.order_amount,
             rc.commission_rate, rc.commission_amount, rc.status, rc.pending_until,
             rc.paid_at, rc.created_at,
             u1.nickname AS referrer_nickname, u1.phone AS referrer_phone,
             u2.nickname AS referred_nickname, u2.phone AS referred_phone
      FROM referral_commissions rc
      LEFT JOIN users u1 ON rc.referrer_id = u1.id
      LEFT JOIN users u2 ON rc.referred_id = u2.id
      ${where}
      ORDER BY rc.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limitNum, offset])

    const countResult = await query(`SELECT COUNT(*) as total FROM referral_commissions ${where}`, params)

    res.json({ rows, total: countResult[0].total, page: pageNum, limit: limitNum })
  } catch (error) {
    logger.error('admin', 'Commissions error', { error: error.message })
    res.status(500).json({ message: '获取返利列表失败' })
  }
})

router.put('/commissions/:id/status', async (req, res) => {
  const { id } = req.params
  const { status } = req.body

  if (!['pending', 'paid', 'cancelled'].includes(status)) {
    return res.status(400).json({ message: '状态无效' })
  }

  try {
    const updateFields = { status }
    if (status === 'paid') {
      updateFields.paid_at = new Date()
    }

    const fields = Object.keys(updateFields).map(k => `${k} = ?`).join(', ')
    const values = [...Object.values(updateFields), id]

    await query(`UPDATE referral_commissions SET ${fields} WHERE id = ?`, values)
    res.json({ success: true })
  } catch (error) {
    logger.error('admin', `Update commission status error: ${error.message}`)
    res.status(500).json({ message: '更新状态失败' })
  }
})

// === 用户管理操作 ===
router.put('/users/:id/member-level', async (req, res) => {
  const { id } = req.params
  const { member_level, member_expire_at } = req.body

  if (!member_level || !['free', 'starter', 'pro', 'annual'].includes(member_level)) {
    return res.status(400).json({ message: '会员等级无效' })
  }

  try {
    const expire = member_expire_at || null
    await query(
      'UPDATE users SET member_level = ?, member_expire_at = ? WHERE id = ?',
      [member_level, expire, id]
    )
    res.json({ success: true })
  } catch (error) {
    logger.error('admin', `Update user member level error: ${error.message}`)
    res.status(500).json({ message: '更新会员等级失败' })
  }
})

router.post('/users/:id/extend-expire', async (req, res) => {
  const { id } = req.params
  const { days } = req.body

  if (!days || days <= 0) {
    return res.status(400).json({ message: '天数必须大于0' })
  }

  try {
    const users = await query('SELECT member_expire_at FROM users WHERE id = ?', [id])
    if (users.length === 0) return res.status(404).json({ message: '用户不存在' })

    let newExpire
    if (users[0].member_expire_at) {
      newExpire = new Date(users[0].member_expire_at)
    } else {
      newExpire = new Date()
    }
    newExpire.setDate(newExpire.getDate() + days)

    await query('UPDATE users SET member_expire_at = ? WHERE id = ?', [newExpire, id])
    res.json({ success: true, new_expire_at: newExpire })
  } catch (error) {
    logger.error('admin', `Extend user expire error: ${error.message}`)
    res.status(500).json({ message: '延长有效期失败' })
  }
})

// === 错误日志 ===
router.get('/error-logs', async (req, res) => {
  const { level = 'error', lines = 100 } = req.query
  const maxLines = Math.min(500, Math.max(1, parseInt(lines) || 100))

  try {
    const logDir = process.env.LOG_DIR || './logs'
    const fs = await import('fs')
    const path = await import('path')
    const readline = await import('readline')
    const errorLogFile = path.resolve(logDir, 'backend-error.log')

    if (!fs.existsSync(errorLogFile)) {
      return res.json({ logs: [] })
    }

    // 使用流式读取最后 N 行，避免大文件 OOM
    const fileStream = fs.createReadStream(errorLogFile)
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity })

    const allLines = []
    for await (const line of rl) {
      if (line.trim()) allLines.push(line)
      // 只保留最后 maxLines 行，防止内存溢出
      if (allLines.length > maxLines * 2) {
        allLines.splice(0, allLines.length - maxLines)
      }
    }

    const logs = []
    for (const line of allLines) {
      try {
        const entry = JSON.parse(line)
        if (!level || entry.level === level || level === 'all') {
          logs.push(entry)
        }
      } catch {
        if (!level || level === 'all') {
          logs.push({ raw: line, timestamp: new Date().toISOString() })
        }
      }
    }

    res.json({ logs: logs.slice(-maxLines) })
  } catch (error) {
    logger.error('admin', `Read error logs failed: ${error.message}`)
    res.status(500).json({ message: '读取日志失败' })
  }
})

// === 用户反馈管理 ===
router.get('/user-feedbacks', async (req, res) => {
  const { type, status, page = 1, limit = 50 } = req.query
  const pageNum = Math.max(1, parseInt(page) || 1)
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50))
  const offset = (pageNum - 1) * limitNum

  try {
    const conditions = []
    const params = []

    if (type && ['feature', 'bug'].includes(type)) {
      conditions.push('type = ?')
      params.push(type)
    }
    if (status && ['pending', 'processing', 'resolved', 'closed'].includes(status)) {
      conditions.push('status = ?')
      params.push(status)
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const rows = await query(`
      SELECT f.id, f.user_id, f.type, f.title, f.description, f.image_url, f.status,
             f.admin_note, f.created_at, f.updated_at,
             u.phone, u.nickname
      FROM user_feedbacks f
      LEFT JOIN users u ON f.user_id = u.id
      ${where}
      ORDER BY f.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limitNum, offset])

    const countResult = await query(`SELECT COUNT(*) as total FROM user_feedbacks ${where}`, params)

    res.json({ rows, total: countResult[0].total, page: pageNum, limit: limitNum })
  } catch (error) {
    logger.error('admin', `Get user feedbacks error: ${error.message}`)
    res.status(500).json({ message: '获取反馈列表失败' })
  }
})

router.put('/user-feedbacks/:id', async (req, res) => {
  const { id } = req.params
  const { status, admin_note } = req.body

  if (status && !['pending', 'processing', 'resolved', 'closed'].includes(status)) {
    return res.status(400).json({ message: '状态无效' })
  }

  try {
    const updates = []
    const values = []

    if (status) {
      updates.push('status = ?')
      values.push(status)
    }
    if (admin_note !== undefined) {
      updates.push('admin_note = ?')
      values.push(admin_note)
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: '无更新内容' })
    }

    values.push(id)
    await query(`UPDATE user_feedbacks SET ${updates.join(', ')} WHERE id = ?`, values)
    res.json({ success: true })
  } catch (error) {
    logger.error('admin', `Update user feedback error: ${error.message}`)
    res.status(500).json({ message: '更新反馈失败' })
  }
})

// === 系统配置 ===
router.get('/config', async (req, res) => {
  try {
    const config = {
      referral: {
        bonusDays: process.env.REFERRAL_BONUS_DAYS_PER_REFERRAL || '1',
        commissionRate: process.env.REFERRAL_COMMISSION_RATE || '0.2',
        cooldownDays: process.env.REFERRAL_COMMISSION_COOLDOWN_DAYS || '7'
      },
      payment: {
        callbackSecret: process.env.PAYMENT_CALLBACK_SECRET ? '***已配置***' : '⚠️ 未配置',
        frontendBaseUrl: process.env.FRONTEND_BASE_URL || 'http://localhost:5173'
      },
      llm: {
        baseUrl: process.env.MCAI_LLM_BASE_URL || '未配置',
        model: process.env.MCAI_LLM_MODEL || '未配置',
        apiKey: process.env.MCAI_LLM_API_KEY ? '***已配置***' : '⚠️ 未配置'
      },
      database: {
        host: process.env.DB_HOST || 'localhost',
        name: process.env.DB_NAME || 'woying_ai',
        user: process.env.DB_USER || 'woying'
      },
      system: {
        nodeEnv: process.env.NODE_ENV || 'development',
        port: process.env.PORT || '3000',
        useRealRedis: process.env.USE_REAL_REDIS || 'false'
      }
    }
    res.json(config)
  } catch (error) {
    logger.error('admin', `Get config error: ${error.message}`)
    res.status(500).json({ message: '获取配置失败' })
  }
})

// CSV 字段转义函数
function escapeCSV(value) {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

// === 数据导出 ===
router.get('/export/users', async (req, res) => {
  try {
    const MAX_EXPORT = 10000
    const users = await query(
      'SELECT id, phone, nickname, member_level, member_expire_at, referral_code, referred_by, referral_bonus_days, created_at FROM users ORDER BY id DESC LIMIT ?',
      [MAX_EXPORT]
    )

    const headers = ['ID', '手机号', '昵称', '会员等级', '到期时间', '推荐码', '推荐人ID', '返利天数', '注册时间']
    const rows = users.map(u => [
      u.id, u.phone, u.nickname || '', u.member_level,
      u.member_expire_at || '', u.referral_code || '', u.referred_by || '',
      u.referral_bonus_days || 0, u.created_at
    ].map(escapeCSV))

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename=users_export.csv')
    res.send('\uFEFF' + csv)
  } catch (error) {
    logger.error('admin', `Export users error: ${error.message}`)
    res.status(500).json({ message: '导出用户数据失败' })
  }
})

router.get('/export/orders', async (req, res) => {
  try {
    const MAX_EXPORT = 10000
    const orders = await query(`
      SELECT o.id, o.user_id, o.plan_code, o.plan_name, o.amount, o.status,
             o.paid_at, o.created_at, u.phone, u.nickname
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.id DESC
      LIMIT ?
    `, [MAX_EXPORT])

    const headers = ['订单号', '用户ID', '手机号', '昵称', '套餐代码', '套餐名称', '金额', '状态', '支付时间', '创建时间']
    const rows = orders.map(o => [
      o.id, o.user_id, o.phone || '', o.nickname || '', o.plan_code, o.plan_name || '',
      o.amount, o.status, o.paid_at || '', o.created_at
    ].map(escapeCSV))

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename=orders_export.csv')
    res.send('\uFEFF' + csv)
  } catch (error) {
    logger.error('admin', `Export orders error: ${error.message}`)
    res.status(500).json({ message: '导出订单数据失败' })
  }
})

router.get('/export/commissions', async (req, res) => {
  try {
    const MAX_EXPORT = 10000
    const commissions = await query(`
      SELECT rc.id, rc.referrer_id, rc.referred_id, rc.order_id, rc.order_amount,
             rc.commission_rate, rc.commission_amount, rc.status, rc.pending_until,
             rc.paid_at, rc.created_at,
             u1.phone AS referrer_phone, u1.nickname AS referrer_nickname,
             u2.phone AS referred_phone, u2.nickname AS referred_nickname
      FROM referral_commissions rc
      LEFT JOIN users u1 ON rc.referrer_id = u1.id
      LEFT JOIN users u2 ON rc.referred_id = u2.id
      ORDER BY rc.created_at DESC
      LIMIT ?
    `, [MAX_EXPORT])

    const headers = ['返利ID', '推荐人ID', '推荐人手机', '推荐人昵称', '被推荐人ID', '被推荐人手机', '被推荐人昵称',
                     '订单号', '订单金额', '返利比例', '返利金额', '状态', '冻结至', '发放时间', '创建时间']
    const rows = commissions.map(c => [
      c.id, c.referrer_id, c.referrer_phone || '', c.referrer_nickname || '',
      c.referred_id, c.referred_phone || '', c.referred_nickname || '',
      c.order_id, c.order_amount, c.commission_rate, c.commission_amount,
      c.status, c.pending_until || '', c.paid_at || '', c.created_at
    ].map(escapeCSV))

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename=commissions_export.csv')
    res.send('\uFEFF' + csv)
  } catch (error) {
    logger.error('admin', `Export commissions error: ${error.message}`)
    res.status(500).json({ message: '导出返利数据失败' })
  }
})

router.get('/export/feedbacks', async (req, res) => {
  try {
    const MAX_EXPORT = 10000
    const feedbacks = await query(`
      SELECT f.id, f.user_id, f.type, f.title, f.description, f.status,
             f.admin_note, f.created_at, f.updated_at,
             u.phone, u.nickname
      FROM user_feedbacks f
      LEFT JOIN users u ON f.user_id = u.id
      ORDER BY f.created_at DESC
      LIMIT ?
    `, [MAX_EXPORT])

    const headers = ['反馈ID', '用户ID', '手机号', '昵称', '类型', '标题', '描述', '状态', '管理员备注', '创建时间', '更新时间']
    const rows = feedbacks.map(f => [
      f.id, f.user_id, f.phone || '', f.nickname || '',
      f.type === 'feature' ? '需求建议' : 'Bug报错',
      f.title, f.description || '', f.status, f.admin_note || '',
      f.created_at, f.updated_at
    ].map(escapeCSV))

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename=feedbacks_export.csv')
    res.send('\uFEFF' + csv)
  } catch (error) {
    logger.error('admin', `Export feedbacks error: ${error.message}`)
    res.status(500).json({ message: '导出反馈数据失败' })
  }
})

// === 工具管理 ===
router.get('/tools', async (req, res) => {
  try {
    const toolUsage = await query(`
      SELECT tool_code, COUNT(*) as total_usage,
             SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) as today_usage,
             SUM(CASE WHEN DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as week_usage,
             COUNT(DISTINCT user_id) as unique_users,
             MAX(created_at) as last_used
      FROM tool_usage
      GROUP BY tool_code
      ORDER BY total_usage DESC
    `)

    // 从工具配置构建列表
    const { TOOL_REQUIRED_LEVELS, getToolAccessMeta } = await import('../config/toolAccess.js')

    const toolMeta = {}
    for (const [code, level] of Object.entries(TOOL_REQUIRED_LEVELS)) {
      const meta = getToolAccessMeta(code)
      toolMeta[code] = {
        code,
        requiredLevel: level,
        ...meta
      }
    }

    const result = toolUsage.map(u => ({
      ...toolMeta[u.tool_code],
      totalUsage: u.total_usage,
      todayUsage: u.today_usage,
      weekUsage: u.week_usage,
      uniqueUsers: u.unique_users,
      lastUsed: u.last_used
    }))

    // 补充未使用的工具
    for (const [code, info] of Object.entries(toolMeta)) {
      if (!result.find(r => r.code === code)) {
        result.push({ ...info, totalUsage: 0, todayUsage: 0, weekUsage: 0, uniqueUsers: 0, lastUsed: null })
      }
    }

    res.json(result)
  } catch (error) {
    logger.error('admin', `Get tools error: ${error.message}`)
    res.status(500).json({ message: '获取工具列表失败' })
  }
})

export default router
