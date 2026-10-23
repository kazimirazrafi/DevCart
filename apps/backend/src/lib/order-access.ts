import { createHmac, timingSafeEqual } from "node:crypto"

import { MedusaError } from "@medusajs/framework/utils"

/*
 * Who may read an order.
 *
 * Medusa leaves `GET /store/orders/:id` unauthenticated on purpose: a guest has
 * no account to sign in with, so the order id is the only thing the storefront
 * can hand them after checkout. That makes the id a password, and the id is
 * also a URL — it ends up in browser history, screenshots, shared links and
 * server logs, any of which let someone else read the order's email, address
 * and contents.
 *
 * So the id stays the address and a separate secret is the capability. The
 * token is derived rather than stored: HMAC-SHA256 over the order id and an
 * expiry, keyed by `ORDER_ACCESS_SECRET`. Nothing is written to the order, both
 * apps can mint a link for the same order without a round trip, and possession
 * of the id alone is worth nothing. The trade is that a token cannot be revoked
 * on its own — rotating the secret revokes every outstanding link at once,
 * which is the documented behaviour.
 *
 * The same algorithm lives in `apps/storefront/src/lib/util/order-access.ts`.
 * The two must agree: the storefront mints the link it redirects to after
 * checkout, and this side is what checks it.
 */

const TOKEN_VERSION = "v1"
const TOKEN_PARTS = 3

/** How long a guest's order link keeps working. */
export const ORDER_ACCESS_TTL_MS = 30 * 24 * 60 * 60 * 1000

const secret = (): string => {
  const value = process.env.ORDER_ACCESS_SECRET

  /*
   * Refusing to sign or verify is the safe failure. A fallback secret would
   * make every deployment that forgot the variable use a value that is in the
   * repository, which is the same as leaving the route open.
   */
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

/**
 * A link-safe token that lets its holder read one order until `expiresAt`.
 * The order id is part of what is signed, so a token for one order is useless
 * against another.
 */
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

  // Expired or malformed. Checked before signing so a stale link costs one
  // comparison rather than an HMAC.
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

/**
 * Where an email's "View your order" goes. No country code: the storefront's
 * middleware adds the visitor's region, exactly as it does for any other link.
 */
export const orderAccessUrl = (orderId: string): string =>
  `${storefrontUrl()}/order/${orderId}/confirmed?token=${encodeURIComponent(
    createOrderAccessToken(orderId)
  )}`
