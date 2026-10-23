import "server-only"
import { createHmac } from "node:crypto"

/*
 * The token in an order confirmation link.
 *
 * A guest has no account, so after checkout the only thing that can prove the
 * visitor may read the order is something they were handed. The order id is
 * handed to everyone (it is a URL), so the capability is this separate token:
 * an HMAC over the order id and an expiry, signed with `ORDER_ACCESS_SECRET`.
 *
 * The backend (`apps/backend/src/lib/order-access.ts`) verifies the same
 * format and holds the middleware that gates `GET /store/orders/:id`. The two
 * implementations have to agree, so change them together.
 */

const TOKEN_VERSION = "v1"

/** How long a guest's order link keeps working. */
const ORDER_ACCESS_TTL_MS = 30 * 24 * 60 * 60 * 1000

const secret = (): string => {
  const value = process.env.ORDER_ACCESS_SECRET

  /*
   * Failing here stops a checkout that could not produce a readable
   * confirmation link, rather than redirecting the customer to a page the
   * backend would refuse. A fallback secret would be one that ships in this
   * repository, which is the same as no token at all.
   */
  if (!value || value.length < 32) {
    throw new Error(
      "ORDER_ACCESS_SECRET must be set to at least 32 characters, and must match the backend's value. See apps/storefront/.env.template."
    )
  }

  return value
}

/**
 * A token for one order, valid for 30 days. Used where the visitor is already
 * known to be allowed to see that order — the redirect after their own
 * checkout. Emails mint the same token on the backend.
 */
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
