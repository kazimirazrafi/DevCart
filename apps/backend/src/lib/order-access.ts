import { createHmac, timingSafeEqual } from "node:crypto"

import { MedusaError } from "@medusajs/framework/utils"

/*
 * An order id is a URL, so the link carries a token instead: HMAC over the id
 * and an expiry, keyed by ORDER_ACCESS_SECRET. Rotating the secret revokes
 * every outstanding link. The storefront mints the same token (see
 * apps/storefront/src/lib/util/order-access.ts), so both sides must agree.
 */

const TOKEN_VERSION = "v1"
const TOKEN_PARTS = 3

/** How long a guest's order link keeps working. */
export const ORDER_ACCESS_TTL_MS = 30 * 24 * 60 * 60 * 1000

const secret = (): string => {
  const value = process.env.ORDER_ACCESS_SECRET

  // Refusing is the safe failure; a fallback secret would ship in the repo.
  if (!value || value.length < 32) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "ORDER_ACCESS_SECRET must be set to at least 32 characters, and must be the same value in the backend and the storefront. See apps/backend/.env.template."
    )
  }

  return value
}

const sign = (orderId: string, expiresAt: number): string =>
  createHmac("sha256", secret())
    .update(`${TOKEN_VERSION}:${orderId}:${expiresAt}`)
    .digest("base64url")

/** Token for one order until `expiresAt`; the order id is part of the signature. */
export const createOrderAccessToken = (
  orderId: string,
  {
    now = Date.now(),
    ttlMs = ORDER_ACCESS_TTL_MS,
  }: { now?: number; ttlMs?: number } = {}
): string => {
  const expiresAt = now + ttlMs

  return `${TOKEN_VERSION}.${expiresAt}.${sign(orderId, expiresAt)}`
}

export const verifyOrderAccessToken = (
  orderId: string,
  token: string | null | undefined,
  now: number = Date.now()
): boolean => {
  if (!token) {
    return false
  }

  const parts = token.split(".")

  if (parts.length !== TOKEN_PARTS) {
    return false
  }

  const [version, expiresAtRaw, provided] = parts

  if (version !== TOKEN_VERSION) {
    return false
  }

  const expiresAt = Number(expiresAtRaw)

  // Checked before signing, so a stale link costs one comparison.
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= now) {
    return false
  }

  const expected = Buffer.from(sign(orderId, expiresAt))
  const actual = Buffer.from(provided)

  return (
    actual.length === expected.length && timingSafeEqual(actual, expected)
  )
}

const storefrontUrl = () =>
  (process.env.STOREFRONT_URL || "http://localhost:8000").replace(/\/+$/, "")

/** No country code: the storefront's middleware adds the visitor's region. */
export const orderAccessUrl = (orderId: string): string =>
  `${storefrontUrl()}/order/${orderId}/confirmed?token=${encodeURIComponent(
    createOrderAccessToken(orderId)
  )}`
