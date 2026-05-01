import jwt from 'jsonwebtoken'

function getJwtSecret() {
  return process.env.JWT_SECRET
}

function ensureJwtSecret(res) {
  if (!getJwtSecret()) {
    res.status(500).json({ message: '服务端认证配置缺失' })
    return false
  }
  return true
}

export function authMiddleware(req, res, next) {
  if (process.env.NODE_ENV === 'development') {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = { userId: 0, memberLevel: 'annual' }
      return next()
    }
  }

  if (!ensureJwtSecret(res)) return
  const jwtSecret = getJwtSecret()

  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: '未授权' })
  }

  const token = authHeader.split(' ')[1]
  try {
    const decoded = jwt.verify(token, jwtSecret)
    req.user = decoded
    next()
  } catch (error) {
    return res.status(401).json({ message: 'Token无效或已过期' })
  }
}

export function optionalAuth(req, res, next) {
  const jwtSecret = getJwtSecret()
  if (!jwtSecret) {
    return next()
  }

  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]
    try {
      const decoded = jwt.verify(token, jwtSecret)
      req.user = decoded
    } catch (error) {
      // ignore
    }
  }
  next()
}
