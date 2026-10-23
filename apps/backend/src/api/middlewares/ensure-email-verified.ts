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
 * The last check before a cart becomes an order: does this guest really read
 * the address the order will be sent to?
 *
 * The contact step asks for a code and only continues once the backend has
 * accepted it, but that is the storefront's own account of events — a script
 * can post to `/store/carts/:id/complete` directly. So the rule is enforced
 * here, where the order is actually created and *before* the payment is
 * authorized: an unverified guest checkout stops while the cart is still a
 * cart, rather than after a card has been charged.
 *
 * Three ways through:
 *
 * - a signed-in customer, whose address came from their account and is already
 *   somebody's;
 * - a request carrying a token bound to the cart's address (the storefront
 *   keeps it in a cookie and sends it as a header);
 * - nothing to prove: a cart with no email yet. Completion fails for its own
 *   reasons there, and letting it through keeps this check from hiding them.
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

  /*
   * A 403 with a machine-readable code, not a 400 with prose: the storefront
   * has to tell the customer to verify their address rather than "the order
   * could not be created", and it does that by the code alone.
   */
  return res.status(403).json({
    type: "email_verification_required",
    message:
      "Verify your email address before placing the order. We sent you a six-digit code.",
  })
}
