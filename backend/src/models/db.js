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
        host: process.env.MYSQL_HOST || 'localhost',
        port: process.env.MYSQL_PORT || 3306,
        database: process.env.MYSQL_DATABASE || 'woai_ai',
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
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

// 暴露连接池获取方法，用于事务操作
export async function getConnection() {
  if (useMock || !pool) {
    throw new Error('Database connection not available')
  }
  return pool.getConnection()
}

export async function initDB() {
  console.log('[DB] initDB called (MySQL mode)')
}

  if (!pool) {
    try {
      pool = mysql.createPool({
        host: process.env.MYSQL_HOST || 'localhost',
        port: process.env.MYSQL_PORT || 3306,
        database: process.env.MYSQL_DATABASE || 'woai_ai',
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
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
    // 生产环境禁止 fallback 到 mock，应直接报错
    if (process.env.NODE_ENV === 'production') {
      console.error('[DB] Query failed in production:', err.message)
      throw err
    }
    console.warn('[DB] Query failed, falling back to mock:', err.message)
    useMock = true
    return createMockQuery()(sql, params)
  }
}

export async function initDB() {
  console.log('[DB] initDB called (MySQL mode)')
}
