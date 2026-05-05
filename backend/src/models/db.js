import mysql from 'mysql2/promise'
import { createMockQuery } from './mockDb.js'

let pool = null
let useMock = false

export async function query(sql, params) {
  if (useMock) {
    return createMockQuery()(sql, params)
  }

  if (!pool) {
    try {
      pool = mysql.createPool({
        host: process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost',
        port: process.env.DB_PORT || process.env.MYSQL_PORT || 3306,
        database: process.env.DB_NAME || process.env.MYSQL_DATABASE || 'woai_ai',
        user: process.env.DB_USER || process.env.MYSQL_USER || 'root',
        password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || '',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        connectTimeout: 3000
      })
      const connection = await pool.getConnection()
      connection.release()
      console.log('[DB] MySQL connected')
    } catch (err) {
      console.warn('[DB] MySQL unavailable, using in-memory mock:', err.message)
      useMock = true
      return createMockQuery()(sql, params)
    }
  }

  try {
    const [results] = await pool.execute(sql, params)
    return results
  } catch (err) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[DB] Query failed in production:', err.message)
      throw err
    }
    console.warn('[DB] Query failed, falling back to mock:', err.message)
    useMock = true
    return createMockQuery()(sql, params)
  }
}

export async function getConnection() {
  if (useMock || !pool) {
    throw new Error('Database connection not available')
  }
  return pool.getConnection()
}

export async function initDB() {
  console.log('[DB] initDB called (MySQL mode)')
}
