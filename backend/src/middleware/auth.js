import jwt from 'jsonwebtoken'

function getJwtSecret() {
  return process.env.JWT_SECRET
}

export function isGuestModeEnabled() {
  return process.env.NODE_ENV !== 'production' && process.env.GUEST_MODE !== 'false'
}

function attachGuestUser(req) {
  req.user = {
    userId: null,
    guest: true,
    memberLevel: 'annual'
  }
}

function ensureJwtSecret(res) {
  if (isGuestModeEnabled()) {
    return true
  }
  if (!getJwtSecret()) {
    res.status(500).json({ message: '服务端认证配置缺失' })
    return false
  }
  return true
}

export function authMiddleware(req, res, next) {
  if (!ensureJwtSecret(res)) return
  const jwtSecret = getJwtSecret()

  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    if (isGuestModeEnabled()) {
      attachGuestUser(req)
      return next()
    }
    return res.status(401).json({ message: '未授权' })
  }

  const token = authHeader.split(' ')[1]
  try {
    const decoded = jwt.verify(token, jwtSecret)
    req.user = decoded
    next()
  } catch (error) {
    if (isGuestModeEnabled()) {
      attachGuestUser(req)
      return next()
    }
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
