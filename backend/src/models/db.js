import dotenv from 'dotenv'
dotenv.config()

import mysql from 'mysql2/promise'
import { createMockQuery } from './mockDb.js'

let pool = null
let useMock = false
const ALLOW_DB_MOCK = process.env.ALLOW_DB_MOCK === 'true'

function withMockOrThrow(sql, params, err, stage) {
  if (!ALLOW_DB_MOCK) {
    throw new Error(`[DB] ${stage} failed: ${err.message}`)
  }
  console.warn(`[DB] ${stage} failed, using in-memory mock:`, err.message)
  useMock = true
  return createMockQuery()(sql, params)
}

export async function query(sql, params) {
  if (useMock) {
    return createMockQuery()(sql, params)
  }

  if (!pool) {
    try {
      pool = mysql.createPool({
        host: process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost',
        port: process.env.DB_PORT || process.env.MYSQL_PORT || 3306,
        database: process.env.DB_NAME || process.env.MYSQL_DATABASE || 'woying_ai',
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
      return withMockOrThrow(sql, params, err, 'connect')
    }
  }

  try {
    const [results] = await pool.execute(sql, params)
    return results
  } catch (err) {
    return withMockOrThrow(sql, params, err, 'query')
  }
}

export async function initDB() {
  console.log('[DB] initDB called (MySQL mode)')
}

export function getDBMode() {
  return useMock ? 'mock' : 'mysql'
}
