import { Router } from 'express'
import { query } from '../models/db.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

// Save sheet data
router.post('/save', authMiddleware, async (req, res) => {
  try {
    const { sheetCode, data } = req.body
    const userId = req.user?.id || req.user?.userId

    if (!sheetCode || !data) {
      return res.status(400).json({ success: false, message: 'Missing sheetCode or data' })
    }

    await query(
      'INSERT INTO user_sheets (user_id, sheet_code, sheet_data) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE sheet_data = VALUES(sheet_data), updated_at = NOW()',
      [userId, sheetCode, JSON.stringify(data)]
    )

    res.json({ success: true, message: 'Saved successfully' })
  } catch (error) {
    console.error('[Sheets] Save error:', error)
    res.status(500).json({ success: false, message: 'Save failed' })
  }
})

// Load sheet data by ID
router.get('/load/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user?.id || req.user?.userId

    const results = await query(
      'SELECT * FROM user_sheets WHERE id = ? AND user_id = ?',
      [id, userId]
    )

    if (!results || results.length === 0) {
      return res.status(404).json({ success: false, message: 'Sheet not found' })
    }

    const sheet = results[0]
    res.json({
      success: true,
      data: JSON.parse(typeof sheet.sheet_data === 'string' ? sheet.sheet_data : JSON.stringify(sheet.sheet_data))
    })
  } catch (error) {
    console.error('[Sheets] Load error:', error)
    res.status(500).json({ success: false, message: 'Load failed' })
  }
})

// List user's sheets by code
router.get('/list', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId
    const { sheetCode } = req.query

    let sql = 'SELECT id, sheet_code, created_at, updated_at FROM user_sheets WHERE user_id = ?'
    const params = [userId]

    if (sheetCode) {
      sql += ' AND sheet_code = ?'
      params.push(sheetCode)
    }

    sql += ' ORDER BY updated_at DESC LIMIT 20'

    const results = await query(sql, params)

    res.json({
      success: true,
      list: results.map(s => ({
        id: s.id,
        sheetCode: s.sheet_code,
        created_at: s.created_at,
        updated_at: s.updated_at
      }))
    })
  } catch (error) {
    console.error('[Sheets] List error:', error)
    res.status(500).json({ success: false, message: 'List failed' })
  }
})

export default router