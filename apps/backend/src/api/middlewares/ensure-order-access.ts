import {
  AuthenticatedMedusaRequest,
  MedusaNextFunction,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"

import { verifyOrderAccessToken } from "../../lib/order-access"

/**
 * Who gets to read an order from `GET /store/orders/:id`.
 *
 * The route is the one Store API read Medusa leaves open, because a guest has
 * no session to prove themselves with (see `lib/order-access.ts`). This
 * middleware closes that: a request must either be the signed-in customer the
 * order belongs to, or carry the token the storefront minted for that order.
 *
 * It runs after `authenticate(... allowUnauthenticated)`, so a guest reaches
 * here with no `auth_context` at all and a customer with their id. Everything
 * this refuses is answered as "not found" — the same answer the route gives for
 * an id that does not exist — so a caller cannot probe which order ids are
 * real.
 */
export async function ensureOrderAccess(
  req: AuthenticatedMedusaRequest,
  _res: MedusaResponse,
  next: MedusaNextFunction
) {
  const orderId = req.params.id
  const customerId = req.auth_context?.actor_id

  const header = req.headers["x-order-access-token"]
  const token = Array.isArray(header) ? header[0] : header

  /*
   * The customer's own id is the first proof, and it needs no token: an owner
   * signing in from a new browser is allowed even when the link they followed
   * has expired. Ownership is still checked against the order itself.
   */
  if (customerId && (await isOrderOfCustomer(orderId, customerId, req))) {
    return next()
  }

  if (verifyOrderAccessToken(orderId, token)) {
    return next()
  }

  return next(
    new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Order with id "${orderId}" was not found.`
    )
  )
}

/**
 * Ownership is asked of the Query API rather than the route's own read, so the
 * check happens before any order field is selected or sent.
 */
async function isOrderOfCustomer(
  orderId: string,
  customerId: string,
  req: AuthenticatedMedusaRequest
): Promise<boolean> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [order],
  } = await query.graph({
    entity: "order",
    fields: ["id", "customer_id"],
    filters: { id: orderId },
  })

  return Boolean(order) && order.customer_id === customerId
}
