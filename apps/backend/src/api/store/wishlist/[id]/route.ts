import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { removeWishlistItemWorkflow } from "../../../../workflows/remove-wishlist-item"

/**
 * DELETE /store/wishlist/:id
 *
 * Removes one save. The workflow scopes the row to the signed-in customer, so
 * somebody else's id answers `404` rather than deleting it; 204 on success,
 * with no body, because there is nothing left to return.
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
