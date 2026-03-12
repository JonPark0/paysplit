import type { NextFunction, Request, Response } from 'express'

interface BucketState {
  count: number
  resetAt: number
}

interface RateLimitOptions {
  windowMs?: number
  max?: number
  name?: string
  message?: string
  keyGenerator?: (req: Request) => string
  skip?: (req: Request) => boolean
}

const buckets = new Map<string, BucketState>()

const cleanupExpiredBuckets = (): void => {
  const now = Date.now()
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key)
    }
  }
}

setInterval(cleanupExpiredBuckets, 60 * 1000).unref()

const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for']
  const forwardedValue = Array.isArray(forwarded) ? forwarded[0] : forwarded
  return req.ip || forwardedValue || req.socket?.remoteAddress || 'unknown'
}

export const createRateLimiter = ({
  windowMs = 15 * 60 * 1000,
  max = 100,
  name = 'default',
  message = 'Too many requests, please try again later',
  keyGenerator = getClientIp,
  skip = () => false
}: RateLimitOptions = {}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (skip(req)) {
      next()
      return
    }

    const key = `${name}:${keyGenerator(req)}`
    const now = Date.now()
    const existing = buckets.get(key)

    if (!existing || existing.resetAt <= now) {
      buckets.set(key, {
        count: 1,
        resetAt: now + windowMs
      })

      res.setHeader('X-RateLimit-Limit', String(max))
      res.setHeader('X-RateLimit-Remaining', String(max - 1))
      res.setHeader('X-RateLimit-Reset', String(Math.ceil((now + windowMs) / 1000)))
      next()
      return
    }

    existing.count += 1
    const remaining = Math.max(0, max - existing.count)

    res.setHeader('X-RateLimit-Limit', String(max))
    res.setHeader('X-RateLimit-Remaining', String(remaining))
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(existing.resetAt / 1000)))

    if (existing.count > max) {
      res.status(429).json({
        error: message,
        timestamp: new Date().toISOString(),
        path: req.path
      })
      return
    }

    next()
  }
}
