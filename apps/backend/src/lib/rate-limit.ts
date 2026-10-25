/*
 * Sliding-window request limiter. Counts in Redis when `REDIS_URL` is set, so
 * instances share one window, and in process memory otherwise. If Redis is
 * unreachable the request is allowed and one warning is logged.
 */

import Redis from "ioredis"

export type SlidingWindow = {
  /** Requests allowed per key per window. */
  limit: number
  windowMs: number
}

export type TakeTokenResult =
  | { allowed: true }
  | { allowed: false; retry_after_seconds: number }

/** Above this many keys the map is swept, so a spray of IPs cannot grow it. */
const SWEEP_THRESHOLD = 5_000

const buckets = new Map<string, number[]>()

const sweep = (now: number, windowMs: number) => {
  if (buckets.size < SWEEP_THRESHOLD) {
    return
  }

  for (const [key, stamps] of buckets) {
    if (!stamps.some((stamp) => stamp > now - windowMs)) {
      buckets.delete(key)
    }
  }
}

/** A refused request is not recorded, so retrying does not extend the wait. */
const takeFromMemory = (
  key: string,
  { limit, windowMs }: SlidingWindow,
  now: number
): TakeTokenResult => {
  sweep(now, windowMs)

  const recent = (buckets.get(key) ?? []).filter(
    (stamp) => stamp > now - windowMs
  )

  if (recent.length >= limit) {
    buckets.set(key, recent)

    return {
      allowed: false,
      retry_after_seconds: Math.max(
        1,
        Math.ceil((recent[0] + windowMs - now) / 1000)
      ),
    }
  }

  recent.push(now)
  buckets.set(key, recent)

  return { allowed: true }
}

/*
 * A sorted set per key gives an exact sliding window. One script so the read
 * and write cannot interleave between instances.
 */
const TAKE_TOKEN_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])

redis.call("ZREMRANGEBYSCORE", key, "-inf", now - window)

local count = redis.call("ZCARD", key)

if count >= limit then
  local oldest = redis.call("ZRANGE", key, 0, 0, "WITHSCORES")
  redis.call("PEXPIRE", key, window)

  local retry = math.ceil((tonumber(oldest[2]) + window - now) / 1000)
  if retry < 1 then retry = 1 end

  return {0, retry}
end

redis.call("ZADD", key, now, ARGV[4])
redis.call("PEXPIRE", key, window)

return {1, 0}
`

let client: Promise<Redis | null> | null = null
let warned = false

const warnOnce = (reason: unknown) => {
  if (warned) {
    return
  }

  warned = true

  const message = reason instanceof Error ? reason.message : String(reason)
  console.warn(
    `Rate limiting is falling back to this process's memory (${message}). ` +
      "Set REDIS_URL so the limit is shared by every instance."
  )
}

const getClient = (): Promise<Redis | null> => {
  const url = process.env.REDIS_URL

  if (!url) {
    return Promise.resolve(null)
  }

  if (!client) {
    try {
      const instance = new Redis(url, {
        // A queued command against a dead Redis would stall checkout.
        enableOfflineQueue: false,
        maxRetriesPerRequest: 2,
      })

      instance.on("error", warnOnce)

      client = Promise.resolve(instance)
    } catch (error) {
      warnOnce(error)

      client = Promise.resolve(null)
    }
  }

  return client
}

/** Counts one request against `key` and says whether it may proceed. */
export const takeToken = async (
  key: string,
  window: SlidingWindow,
  now: number = Date.now()
): Promise<TakeTokenResult> => {
  const redis = await getClient()

  if (!redis) {
    return takeFromMemory(key, window, now)
  }

  try {
    const [allowed, retry] = (await redis.eval(
      TAKE_TOKEN_SCRIPT,
      1,
      `rate-limit:${key}`,
      String(now),
      String(window.windowMs),
      String(window.limit),
      `${now}:${Math.random().toString(36).slice(2)}`
    )) as [number, number]

    return allowed === 1
      ? { allowed: true }
      : { allowed: false, retry_after_seconds: Math.max(1, retry) }
  } catch (error) {
    warnOnce(error)

    return takeFromMemory(key, window, now)
  }
}

/** Test helper: forget every counted request held in this process. */
export const resetRateLimits = () => {
  buckets.clear()
}
