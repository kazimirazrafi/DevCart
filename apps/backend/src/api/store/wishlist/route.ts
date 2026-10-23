import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { WISHLIST_MODULE } from "../../../modules/wishlist"
import WishlistModuleService from "../../../modules/wishlist/service"
import { addWishlistItemWorkflow } from "../../../workflows/add-wishlist-item"
import type { StoreAddWishlistItemBody } from "./validators"

/**
 * GET /store/wishlist
 *
 * The signed-in customer's saves, newest first. Both routes here are behind
 * the `authenticate` middleware in `src/api/middlewares.ts`, so `actor_id` is
 * the customer's id and the query needs no separate ownership filter: the list
 * is always "mine".
 *
 * The rows carry ids only. Prices are a region calculation and a product page
 * reads them with the region's context, so the storefront loads the products a
 * second time through the product endpoints rather than this route inventing a
 * price format of its own.
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const customerId = req.auth_context?.actor_id as string
  const wishlistService: WishlistModuleService =
    req.scope.resolve(WISHLIST_MODULE)

  const items = await wishlistService.listWishlistItems(
    { customer_id: customerId },
    { order: { created_at: "DESC" } }
  )

  res.json({
    items: items.map((item) => ({
      id: item.id,
      product_id: item.product_id,
      variant_id: item.variant_id ?? null,
      created_at: item.created_at,
    })),
    count: items.length,
  })
}

/**
 * POST /store/wishlist
 *
 * Saves a product for the signed-in customer. Saving something already saved
 * is not an error — the heart is a toggle and the answer has to be the row that
 * holds the save — so the first save is `201` and a repeat is `200`.
 */
export async function POST(
  req: AuthenticatedMedusaRequest<StoreAddWishlistItemBody>,
  res: MedusaResponse
) {
  const customerId = req.auth_context?.actor_id as string

  const { result } = await addWishlistItemWorkflow(req.scope).run({
    input: {
      customer_id: customerId,
      product_id: req.validatedBody.product_id,
      variant_id: req.validatedBody.variant_id ?? null,
    },
  })

  res.status(result.created ? 201 : 200).json({
    item: {
      id: result.item.id,
      product_id: result.item.product_id,
      variant_id: result.item.variant_id ?? null,
      created_at: result.item.created_at,
    },
    created: result.created,
  })
}
