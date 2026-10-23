import {
  createStep,
  createWorkflow,
  StepResponse,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { removeRemoteLinkStep } from "@medusajs/medusa/core-flows"
import type { LinkDefinition } from "@medusajs/framework/types"

import { WISHLIST_MODULE } from "../modules/wishlist"
import WishlistModuleService from "../modules/wishlist/service"

export type RemoveWishlistItemInput = {
  id: string
  customer_id: string
}

type RemovedWishlistItem = {
  id: string
  customer_id: string
  product_id: string
  variant_id: string | null
}

/**
 * Reads the row the customer asked to remove, filtered by its owner.
 *
 * The `customer_id` in the filter is the authorization: an id that belongs to
 * somebody else finds nothing and is answered as "not found" rather than
 * deleted, so one customer cannot empty another's wishlist by guessing ids.
 */
const resolveWishlistItemStep = createStep(
  "resolve-wishlist-item",
  async (
    input: RemoveWishlistItemInput,
    { container }
  ): Promise<StepResponse<RemovedWishlistItem>> => {
    const wishlistService: WishlistModuleService =
      container.resolve(WISHLIST_MODULE)

    const [item] = await wishlistService.listWishlistItems(
      { id: input.id, customer_id: input.customer_id },
      { take: 1 }
    )

    if (!item) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "This product is not in your wishlist."
      )
    }

    return new StepResponse({
      id: item.id,
      customer_id: item.customer_id,
      product_id: item.product_id,
      variant_id: item.variant_id ?? null,
    })
  }
)

const deleteWishlistItemStep = createStep(
  "delete-wishlist-item",
  async (item: RemovedWishlistItem, { container }) => {
    const wishlistService: WishlistModuleService =
      container.resolve(WISHLIST_MODULE)

    await wishlistService.deleteWishlistItems([item.id])

    return new StepResponse(item)
  },
  async (item: RemovedWishlistItem | undefined, { container }) => {
    if (!item) {
      return
    }

    const wishlistService: WishlistModuleService =
      container.resolve(WISHLIST_MODULE)

    // The row keeps its id on the way back so the link rows the compensation
    // below re-creates still point at it.
    await wishlistService.createWishlistItems({
      id: item.id,
      customer_id: item.customer_id,
      product_id: item.product_id,
      variant_id: item.variant_id,
    })
  }
)

export const removeWishlistItemWorkflow = createWorkflow(
  "remove-wishlist-item",
  (input: RemoveWishlistItemInput) => {
    const item = resolveWishlistItemStep(input)

    /*
     * The link rows go first so nothing is left pointing at a deleted wishlist
     * item; `removeRemoteLinkStep` puts them back if a later step fails, and
     * compensations run in reverse, so the row is re-created before its links.
     */
    const links = transform({ item }, (data): LinkDefinition[] => [
      {
        [Modules.CUSTOMER]: { customer_id: data.item.customer_id },
        [WISHLIST_MODULE]: { wishlist_item_id: data.item.id },
      },
      {
        [Modules.PRODUCT]: { product_id: data.item.product_id },
        [WISHLIST_MODULE]: { wishlist_item_id: data.item.id },
      },
    ])

    removeRemoteLinkStep(links)
    deleteWishlistItemStep(item)

    return new WorkflowResponse(item)
  }
)
