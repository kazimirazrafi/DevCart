/*
 * A small limit for the things that have no row to count: requests from one
 * caller. It is deliberately coarse — a flood or a script walking a list of
 * addresses — and it is not a per-account lockout. Those are different
 * controls, and Medusa's authentication does not provide one, so a slow
 * password guess against a single address is not what this stops.
 *
 * The count lives in Redis when `REDIS_URL` is set, so every instance shares
 * it, and in this process's memory otherwise. The fallback is what keeps a
 * fresh clone, CI and the test suites working without a Redis server; the
 * limitation is that behind more than one instance with no Redis the limit is
 * per instance, which is still better than no limit and is documented as such.
 *
 * If Redis is configured but unreachable, a request is allowed and the fallback
 * takes over: a limiter must not be able to take checkout down. One warning is
 * logged rather than one per request.
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

/**
 * Counts one request against `key`, and says whether it may proceed.
 *
 * A refused request is not counted, so a caller who keeps hammering during a
 * cooldown does not extend it — the answer stays "wait N seconds" rather than
 * becoming a moving target.
 */
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
 * A sorted set per key, so the window slides exactly as the in-memory one does
 * rather than resetting on a fixed boundary that would let a caller double its
 * allowance across two windows. It runs as one script because the read and the
 * write must not be interleaved by a second instance between them; `PEXPIRE`
 * on every call is what stops a key outliving the last request against it.
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
        // A limiter must answer quickly or not at all: a queued command
        // against a dead Redis would turn checkout into a timeout.
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

/**
 * Counts one request against `key` and says whether it may proceed. Async
 * because the shared store is a network call; with no `REDIS_URL` it resolves
 * from memory without touching the network.
 */
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
