import "server-only"
import { createHmac } from "node:crypto"

/*
 * The token in an order confirmation link: an HMAC over the order id and an
 * expiry, signed with ORDER_ACCESS_SECRET. The backend verifies the same format
 * and gates GET /store/orders/:id, so both implementations change together.
 */

const TOKEN_VERSION = "v1"

/** How long a guest's order link keeps working. */
const ORDER_ACCESS_TTL_MS = 30 * 24 * 60 * 60 * 1000

const secret = (): string => {
  const value = process.env.ORDER_ACCESS_SECRET

  // Fail here rather than link to a page the backend would refuse. A fallback
  // secret would be one that ships in this repository.
  if (!value || value.length < 32) {
    throw new Error(
      "ORDER_ACCESS_SECRET must be set to at least 32 characters, and must match the backend's value. See apps/storefront/.env.template."
    )
  }

  return value
}

/** A token for one order, valid for 30 days. The backend mints the same token for emails. */
export const createOrderAccessToken = (
  orderId: string,
  now: number = Date.now()
): string => {
  const expiresAt = now + ORDER_ACCESS_TTL_MS

  const signature = createHmac("sha256", secret())
    .update(`${TOKEN_VERSION}:${orderId}:${expiresAt}`)
    .digest("base64url")

  return `${TOKEN_VERSION}.${expiresAt}.${signature}`
}

/** The confirmation URL the buyer lands on once the cart completes. */
export const orderConfirmationPath = (orderId: string): string =>
  `/order/${orderId}/confirmed?token=${encodeURIComponent(
    createOrderAccessToken(orderId)
  )}`
