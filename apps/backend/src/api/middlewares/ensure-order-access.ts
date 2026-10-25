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
 * `GET /store/orders/:id` is open in Medusa because guests have no session.
 * Access needs the order's owner or the token the storefront minted for it.
 * Refusals answer 404 so order ids cannot be probed.
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

/** Checked before any order field is selected or sent. */
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
