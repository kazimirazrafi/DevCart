import {
  createOrderAccessToken,
  ORDER_ACCESS_TTL_MS,
  orderAccessUrl,
  verifyOrderAccessToken,
} from "../order-access"

const SECRET = "unit-test-order-access-secret-0123456789abcdef"
const ORDER = "order_01TESTTESTTESTTESTTESTTEST"
const OTHER_ORDER = "order_01OTHEROTHEROTHEROTHEROTHER"

const previousSecret = process.env.ORDER_ACCESS_SECRET
const previousStorefrontUrl = process.env.STOREFRONT_URL

beforeEach(() => {
  process.env.ORDER_ACCESS_SECRET = SECRET
  process.env.STOREFRONT_URL = "https://shop.test/"
})

afterAll(() => {
  if (previousSecret === undefined) {
    delete process.env.ORDER_ACCESS_SECRET
  } else {
    process.env.ORDER_ACCESS_SECRET = previousSecret
  }

  if (previousStorefrontUrl === undefined) {
    delete process.env.STOREFRONT_URL
  } else {
    process.env.STOREFRONT_URL = previousStorefrontUrl
  }
})

describe("order access token", () => {
  it("verifies the token it minted, for the order it was minted for", () => {
    const token = createOrderAccessToken(ORDER)

    expect(verifyOrderAccessToken(ORDER, token)).toBe(true)
  })

  it("does not verify against another order", () => {
    const token = createOrderAccessToken(ORDER)

    expect(verifyOrderAccessToken(OTHER_ORDER, token)).toBe(false)
  })

  it("does not verify a token whose signature was changed", () => {
    const token = createOrderAccessToken(ORDER)
    const [version, expiresAt, signature] = token.split(".")
    const tampered = `${version}.${expiresAt}.${signature.slice(0, -1)}${
      signature.endsWith("A") ? "B" : "A"
    }`

    expect(verifyOrderAccessToken(ORDER, tampered)).toBe(false)
  })

  it("does not verify a token whose expiry was pushed out", () => {
    const token = createOrderAccessToken(ORDER)
    const [version, , signature] = token.split(".")
    const extended = `${version}.${Date.now() + ORDER_ACCESS_TTL_MS * 10}.${signature}`

    expect(verifyOrderAccessToken(ORDER, extended)).toBe(false)
  })

  it("refuses an expired token", () => {
    const now = Date.now()
    const token = createOrderAccessToken(ORDER, { now, ttlMs: 60_000 })

    expect(verifyOrderAccessToken(ORDER, token, now + 59_000)).toBe(true)
    expect(verifyOrderAccessToken(ORDER, token, now + 61_000)).toBe(false)
  })

  it("refuses its own expiry boundary and anything later", () => {
    const now = 1_700_000_000_000
    const token = createOrderAccessToken(ORDER, { now, ttlMs: 1_000 })

    expect(verifyOrderAccessToken(ORDER, token, now + 999)).toBe(true)
    expect(verifyOrderAccessToken(ORDER, token, now + 1_000)).toBe(false)
  })

  it("refuses missing, empty and malformed tokens", () => {
    expect(verifyOrderAccessToken(ORDER, undefined)).toBe(false)
    expect(verifyOrderAccessToken(ORDER, null)).toBe(false)
    expect(verifyOrderAccessToken(ORDER, "")).toBe(false)
    expect(verifyOrderAccessToken(ORDER, "nonsense")).toBe(false)
    expect(verifyOrderAccessToken(ORDER, "v1.nope.signature")).toBe(false)
    expect(verifyOrderAccessToken(ORDER, "v2.9999999999999.signature")).toBe(
      false
    )
  })

  it("refuses every token when the secret changes", () => {
    const token = createOrderAccessToken(ORDER)

    process.env.ORDER_ACCESS_SECRET = `${SECRET}-rotated`

    expect(verifyOrderAccessToken(ORDER, token)).toBe(false)
  })

  it("refuses to sign or verify without a usable secret", () => {
    // Minted while the secret exists, so verification gets past the format and
    // expiry checks and has to reach for the key.
    const token = createOrderAccessToken(ORDER)

    delete process.env.ORDER_ACCESS_SECRET

    expect(() => createOrderAccessToken(ORDER)).toThrow(/ORDER_ACCESS_SECRET/)
    expect(() => verifyOrderAccessToken(ORDER, token)).toThrow(
      /ORDER_ACCESS_SECRET/
    )

    process.env.ORDER_ACCESS_SECRET = "too-short"

    expect(() => createOrderAccessToken(ORDER)).toThrow(/ORDER_ACCESS_SECRET/)
  })

  it("builds a confirmation link on the storefront that carries the token", () => {
    const url = new URL(orderAccessUrl(ORDER))

    expect(url.origin).toBe("https://shop.test")
    expect(url.pathname).toBe(`/order/${ORDER}/confirmed`)
    expect(
      verifyOrderAccessToken(ORDER, url.searchParams.get("token"))
    ).toBe(true)
  })
})
