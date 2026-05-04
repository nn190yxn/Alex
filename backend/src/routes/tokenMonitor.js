// Token Monitor Dashboard API routes
// Provides endpoints for viewing token usage statistics

import express from 'express'
import { getTokenSummary, getRecentEntries, getTodaySummary, MODEL_PRICING } from '../services/tokenMonitor.js'

const router = express.Router()

// Get today's token usage summary
router.get('/today', (req, res) => {
  try {
    const summary = getTodaySummary()
    res.json({
      success: true,
      data: summary
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Get token usage summary for a date range
router.get('/summary', (req, res) => {
  try {
    const { startDate, endDate } = req.query
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate are required (YYYY-MM-DD format)'
      })
    }
    const summary = getTokenSummary(startDate, endDate)
    res.json({
      success: true,
      data: summary
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Get recent token usage entries
router.get('/recent', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50
    const entries = getRecentEntries(Math.min(limit, 200))
    res.json({
      success: true,
      data: entries,
      count: entries.length
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Get model pricing reference
router.get('/pricing', (req, res) => {
  res.json({
    success: true,
    data: MODEL_PRICING
  })
})

// Get dashboard overview (combines multiple stats)
router.get('/dashboard', (req, res) => {
  try {
    const today = getTodaySummary()

    // Last 7 days
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 7)

    const weekSummary = getTokenSummary(
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    )

    res.json({
      success: true,
      data: {
        today,
        last7Days: weekSummary,
        pricing: MODEL_PRICING
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

export default router
