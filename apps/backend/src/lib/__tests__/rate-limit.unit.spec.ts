import { resetRateLimits, takeToken } from "../rate-limit"

const WINDOW = { limit: 3, windowMs: 60_000 }

describe("takeToken", () => {
  beforeEach(() => {
    resetRateLimits()
  })

  it("allows requests up to the limit", async () => {
    const now = 1_000_000

    expect(await takeToken("a", WINDOW, now)).toEqual({ allowed: true })
    expect(await takeToken("a", WINDOW, now + 1)).toEqual({ allowed: true })
    expect(await takeToken("a", WINDOW, now + 2)).toEqual({ allowed: true })
  })

  it("refuses the request after the limit, with a time to wait", async () => {
    const now = 1_000_000

    for (let i = 0; i < WINDOW.limit; i += 1) {
      await takeToken("a", WINDOW, now + i)
    }

    const refused = await takeToken("a", WINDOW, now + 3)

    expect(refused.allowed).toBe(false)
    expect(refused).toHaveProperty("retry_after_seconds", 60)
  })

  it("frees a slot as the window slides", async () => {
    const now = 1_000_000

    for (let i = 0; i < WINDOW.limit; i += 1) {
      await takeToken("a", WINDOW, now)
    }

    expect(
      (await takeToken("a", WINDOW, now + WINDOW.windowMs - 1)).allowed
    ).toBe(false)
    expect(
      (await takeToken("a", WINDOW, now + WINDOW.windowMs + 1)).allowed
    ).toBe(true)
  })

  it("does not extend the wait when a refused caller keeps trying", async () => {
    const now = 1_000_000

    for (let i = 0; i < WINDOW.limit; i += 1) {
      await takeToken("a", WINDOW, now)
    }

    await takeToken("a", WINDOW, now + 20_000)
    await takeToken("a", WINDOW, now + 20_500)

    // The oldest of the three stamps is still `now`, so the wait is measured
    // from it: 60s - 21s, not a fresh 60s for each refusal.
    expect(await takeToken("a", WINDOW, now + 21_000)).toHaveProperty(
      "retry_after_seconds",
      39
    )
  })

  it("counts each key on its own", async () => {
    const now = 1_000_000

    for (let i = 0; i < WINDOW.limit; i += 1) {
      await takeToken("a", WINDOW, now)
    }

    expect((await takeToken("a", WINDOW, now)).allowed).toBe(false)
    expect((await takeToken("b", WINDOW, now)).allowed).toBe(true)
  })
})

/*
 * The same behaviour through Redis, run only where a server is configured: the
 * standard `test:unit` script blanks `REDIS_URL` so the suite stays hermetic,
 * and CI has no Redis at all. Locally, `REDIS_URL=redis://localhost:6379` on
 * this file is what proves the shared path rather than the fallback.
 *
 * Every key is unique per run and the window is short, so nothing has to be
 * cleaned up: the script expires each key on every call.
 */
const describeRedis = process.env.REDIS_URL ? describe : describe.skip

describeRedis("takeToken against Redis", () => {
  const uniqueKey = () =>
    `unit:${Date.now()}-${Math.random().toString(36).slice(2)}`

  it("refuses past the limit and frees the slot as the window slides", async () => {
    const window = { limit: 2, windowMs: 1_000 }
    const key = uniqueKey()

    expect(await takeToken(key, window)).toEqual({ allowed: true })
    expect(await takeToken(key, window)).toEqual({ allowed: true })

    const refused = await takeToken(key, window)

    expect(refused.allowed).toBe(false)
    expect(refused).toHaveProperty("retry_after_seconds", 1)

    await new Promise((resolve) => setTimeout(resolve, 1_100))

    expect(await takeToken(key, window)).toEqual({ allowed: true })
  })

  it("holds two keys apart in the shared store", async () => {
    const window = { limit: 1, windowMs: 5_000 }

    expect(await takeToken(uniqueKey(), window)).toEqual({ allowed: true })
    expect(await takeToken(uniqueKey(), window)).toEqual({ allowed: true })
  })
})
