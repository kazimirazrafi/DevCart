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
 * Reads the row filtered by owner, which is the authorisation: a foreign id is a
 * 404, not a delete.
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

    // The row keeps its id, so the link rows still point at it.
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

    // Links go first so nothing points at a deleted row. Compensations run in
    // reverse, so the row comes back before its links.
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
