import {
  AuthenticatedMedusaRequest,
  MedusaNextFunction,
  MedusaResponse,
} from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

import {
  VERIFICATION_HEADER,
  verifyVerificationToken,
} from "../../lib/email-verification"

/**
 * A guest may only complete a cart for an address they verified. Signed-in
 * customers are exempt, and so is a cart with no email yet, whose completion
 * fails for its own reasons.
 */
export async function ensureEmailVerified(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  if (req.auth_context?.actor_id) {
    return next()
  }

  const cartId = req.params.id
  const cartModule = req.scope.resolve(Modules.CART)

  const cart = await cartModule
    .retrieveCart(cartId, { select: ["id", "email"] })
    .catch(() => null)

  if (!cart?.email) {
    return next()
  }

  const header = req.headers[VERIFICATION_HEADER]
  const token = Array.isArray(header) ? header[0] : header

  if (verifyVerificationToken(cart.email, token)) {
    return next()
  }

  // The storefront picks its message off `type`, so it stays machine-readable.
  return res.status(403).json({
    type: "email_verification_required",
    message:
      "Verify your email address before placing the order. We sent you a six-digit code.",
  })
}
