import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { removeWishlistItemWorkflow } from "../../../../workflows/remove-wishlist-item"

/**
 * DELETE /store/wishlist/:id
 * The workflow scopes the row to the customer, so a foreign id answers 404.
 */
export async function DELETE(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const customerId = req.auth_context?.actor_id as string

  await removeWishlistItemWorkflow(req.scope).run({
    input: {
      id: req.params.id,
      customer_id: customerId,
    },
  })

  res.status(204).send()
}
