import express from 'express'
import crypto from 'crypto'
import { query } from '../models/db.js'
import { authMiddleware } from '../middleware/auth.js'
import { logger } from '../middleware/logger.js'

const router = express.Router()
const PAYMENT_CALLBACK_SECRET = process.env.PAYMENT_CALLBACK_SECRET

function verifyCallbackSign(orderId, status, sign) {
  if (!PAYMENT_CALLBACK_SECRET) return false
  if (!sign) return false

  const payload = `${orderId}:${status}`
  const expected = crypto
    .createHmac('sha256', PAYMENT_CALLBACK_SECRET)
    .update(payload)
    .digest('hex')

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sign))
}

router.post('/create-order', authMiddleware, async (req, res) => {
  const { planCode } = req.body
  const userId = req.user.userId

  const planPrices = {
    starter: 29,
    pro: 99,
    annual: 499
  }

  if (!planPrices[planCode]) {
    return res.status(400).json({ message: '无效的套餐' })
  }

  try {
    const result = await query(
      'INSERT INTO orders (user_id, plan_code, amount, status, created_at) VALUES (?, ?, ?, ?, NOW())',
      [userId, planCode, planPrices[planCode], 'pending']
    )

    const orderId = result.insertId

    const wechatPayUrl = `weixin://wxpay/bizpayurl?pr=${orderId}`

    res.json({
      orderId,
      payUrl: wechatPayUrl,
      amount: planPrices[planCode]
    })
  } catch (error) {
    logger.error('payment', `Create order error: ${error.message}`)
    res.status(500).json({ message: '创建订单失败' })
  }
})

router.post('/callback', async (req, res) => {
  const { orderId, status, sign } = req.body

  if (!PAYMENT_CALLBACK_SECRET) {
    return res.status(500).json({ message: '支付回调配置缺失' })
  }

  if (!orderId || !status) {
    return res.status(400).json({ message: '参数不完整' })
  }

  if (!['paid', 'failed', 'pending'].includes(status)) {
    return res.status(400).json({ message: '状态无效' })
  }

  if (!verifyCallbackSign(orderId, status, sign)) {
    return res.status(401).json({ message: '签名校验失败' })
  }

  try {
    if (status === 'paid') {
      const orders = await query('SELECT * FROM orders WHERE id = ?', [orderId])
      if (orders.length === 0) {
        return res.status(404).json({ message: '订单不存在' })
      }

      const order = orders[0]
      if (order.status === 'paid') {
        return res.json({ message: '已处理' })
      }

      await query('UPDATE orders SET status = ?, paid_at = NOW() WHERE id = ? AND status != ?', ['paid', orderId, 'paid'])

      const cycles = {
        starter: 1,
        pro: 1,
        annual: 12
      }

      await query(
        'UPDATE users SET member_level = ?, member_expire_at = DATE_ADD(NOW(), INTERVAL ? MONTH) WHERE id = ?',
        [order.plan_code, cycles[order.plan_code] || 1, order.user_id]
      )

      res.json({ message: '支付成功' })
    } else {
      await query('UPDATE orders SET status = ? WHERE id = ? AND status != ?', [status, orderId, 'paid'])
      res.json({ message: '状态更新' })
    }
  } catch (error) {
    logger.error('payment', `Payment callback error: ${error.message}`)
    res.status(500).json({ message: '处理失败' })
  }
})

router.get('/order/:orderId', authMiddleware, async (req, res) => {
  const { orderId } = req.params

  try {
    const orders = await query('SELECT * FROM orders WHERE id = ? AND user_id = ?', [orderId, req.user.userId])
    if (orders.length === 0) {
      return res.status(404).json({ message: '订单不存在' })
    }
    res.json(orders[0])
  } catch (error) {
    logger.error('payment', `Get order error: ${error.message}`)
    res.status(500).json({ message: '获取订单失败' })
  }
})

export default router
