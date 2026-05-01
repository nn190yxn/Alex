// Failover and retry mechanism for tool execution

import { logger } from '../middleware/logger.js'

// Retry with exponential backoff
export async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 2,
    baseDelay = 1000,
    maxDelay = 5000,
    timeout = 15000,
    onRetry = null
  } = options

  let lastError

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Create a promise that rejects after timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('操作超时，请稍后重试')), timeout)
      })

      // Race between the operation and timeout
      const result = await Promise.race([fn(), timeoutPromise])
      return result
    } catch (error) {
      lastError = error

      if (attempt < maxRetries) {
        // Exponential backoff with jitter
        const delay = Math.min(
          baseDelay * Math.pow(2, attempt) + Math.random() * 500,
          maxDelay
        )

        logger.warn('failover', `Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`, {
          error: error.message
        })

        if (onRetry) {
          onRetry(attempt + 1, error)
        }

        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError
}

// Fallback response for tool failures
export function getFallbackResponse(toolName, toolCode) {
  return {
    summary: `${toolName}生成失败`,
    sections: [
      {
        title: '系统提示',
        items: [
          '抱歉，当前服务繁忙，未能完成生成。',
          '您可以稍后重试，或联系客服处理。',
          '如需稳定服务，建议升级会员享受优先处理通道。'
        ]
      }
    ],
    actions: [
      {
        priority: 'high',
        title: '稍后重试',
        description: '等待1-2分钟后再次尝试生成',
        owner: '用户',
        timeline: '立即'
      }
    ],
    riskNotes: [],
    benchmarks: null,
    scores: null,
    recommendedTools: [],
    customizationCTA: '\n---\n升级会员即可获得专属深度定制服务及优先处理通道。',
    extra: { isFallback: true, toolCode }
  }
}

// Wrap tool execution with failover
export async function executeWithFailover(toolConfig, formData, executeFn) {
  const toolName = toolConfig.name || toolConfig.code || '未知工具'
  const toolCode = toolConfig.code || 'unknown'
  const startTime = Date.now()

  try {
    const result = await retryWithBackoff(
      () => executeFn(toolConfig, formData),
      {
        maxRetries: 1,
        baseDelay: 500,
        timeout: 20000,
        onRetry: (attempt, error) => {
          logger.warn('failover', `Retrying ${toolCode}`, {
            attempt,
            error: error.message,
            toolCode
          })
        }
      }
    )

    const duration = Date.now() - startTime
    logger.toolSuccess(null, toolCode, duration)

    return result
  } catch (error) {
    const duration = Date.now() - startTime
    logger.toolFailure(null, toolCode, error, duration)

    // Return fallback response instead of throwing
    return getFallbackResponse(toolName, toolCode)
  }
}

// Timeout wrapper for any async operation
export async function withTimeout(promise, timeoutMs, fallback = null) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (fallback !== null) {
        resolve(fallback)
      } else {
        reject(new Error('操作超时'))
      }
    }, timeoutMs)

    promise.then(
      result => {
        clearTimeout(timer)
        resolve(result)
      },
      err => {
        clearTimeout(timer)
        reject(err)
      }
    )
  })
}
