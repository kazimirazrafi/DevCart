import {
  createStep,
  createWorkflow,
  StepResponse,
  transform,
  when,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { createRemoteLinkStep } from "@medusajs/medusa/core-flows"
import type { LinkDefinition } from "@medusajs/framework/types"

import { WISHLIST_MODULE } from "../modules/wishlist"
import WishlistModuleService from "../modules/wishlist/service"

export type AddWishlistItemInput = {
  customer_id: string
  product_id: string
  variant_id?: string | null
}

type ExistingWishlistItem = {
  id: string
  variant_id: string | null
}

/**
 * A save has to be of something real, and a variant has to belong to the
 * product it is saved with — otherwise the wishlist could hold a pairing no
 * product page could ever have produced.
 *
 * Both checks live here rather than in the route because they are the rule,
 * not the transport.
 */
const assertWishlistableStep = createStep(
  "assert-wishlistable",
  async (input: AddWishlistItemInput, { container }) => {
    const productService = container.resolve(Modules.PRODUCT)

    try {
      await productService.retrieveProduct(input.product_id)
    } catch {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "This product does not exist."
      )
    }

    if (input.variant_id) {
      let variant

      try {
        variant = await productService.retrieveProductVariant(input.variant_id)
      } catch {
        throw new MedusaError(
          MedusaError.Types.NOT_FOUND,
          "This variant does not exist."
        )
      }

      if (variant.product_id !== input.product_id) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "This variant does not belong to that product."
        )
      }
    }
  }
)

type UpsertWishlistCompensation = {
  createdId: string | null
  updatedId: string | null
  previousVariantId: string | null
}

/**
 * Saves the product, or updates the variant on the row that already saves it.
 *
 * This is an upsert rather than a create with a uniqueness error: the customer
 * tapped a heart, and a heart is a toggle — a second tap while the first
 * request is still in flight must not answer with an error, and the unique
 * index on (customer_id, product_id) is what keeps the two from becoming two
 * rows.
 */
const upsertWishlistItemStep = createStep(
  "upsert-wishlist-item",
  async (input: AddWishlistItemInput, { container }) => {
    const wishlistService: WishlistModuleService =
      container.resolve(WISHLIST_MODULE)

    const [existing] = await wishlistService.listWishlistItems(
      { customer_id: input.customer_id, product_id: input.product_id },
      { take: 1 }
    )

    if (existing) {
      const variantId = input.variant_id ?? null

      if (variantId === existing.variant_id) {
        // Nothing to write: the same product is already saved this way.
        return new StepResponse(
          { item: existing, created: false },
          {
            createdId: null,
            updatedId: null,
            previousVariantId: null,
          } satisfies UpsertWishlistCompensation
        )
      }

      const updated = await wishlistService.updateWishlistItems({
        id: existing.id,
        variant_id: variantId,
      })

      return new StepResponse(
        { item: updated, created: false },
        {
          createdId: null,
          updatedId: existing.id,
          previousVariantId: existing.variant_id,
        } satisfies UpsertWishlistCompensation
      )
    }

    const item = await wishlistService.createWishlistItems({
      customer_id: input.customer_id,
      product_id: input.product_id,
      variant_id: input.variant_id ?? null,
    })

    return new StepResponse(
      { item, created: true },
      {
        createdId: item.id,
        updatedId: null,
        previousVariantId: null,
      } satisfies UpsertWishlistCompensation
    )
  },
  async (
    compensation: UpsertWishlistCompensation | undefined,
    { container }
  ) => {
    if (!compensation) {
      return
    }

    const wishlistService: WishlistModuleService =
      container.resolve(WISHLIST_MODULE)

    if (compensation.createdId) {
      await wishlistService.deleteWishlistItems([compensation.createdId])
      return
    }

    // Updating a row's variant is undone by putting the old one back, so a
    // failed run leaves the customer's save exactly as it was.
    if (compensation.updatedId) {
      await wishlistService.updateWishlistItems({
        id: compensation.updatedId,
        variant_id: compensation.previousVariantId,
      })
    }
  }
)

export const addWishlistItemWorkflow = createWorkflow(
  "add-wishlist-item",
  (input: AddWishlistItemInput) => {
    assertWishlistableStep(input)
    const written = upsertWishlistItemStep(input)

    /*
     * The module's columns are not enough on their own: the links are what let
     * a customer list their saves and a product know it was saved, so they are
     * written with the row — only for a genuinely new one, since an updated
     * save already has them.
     */
    const links = transform(
      { input, written },
      (data): LinkDefinition[] => [
        {
          [Modules.CUSTOMER]: { customer_id: data.input.customer_id },
          [WISHLIST_MODULE]: { wishlist_item_id: data.written.item.id },
        },
        {
          [Modules.PRODUCT]: { product_id: data.input.product_id },
          [WISHLIST_MODULE]: { wishlist_item_id: data.written.item.id },
        },
      ]
    )

    when("is-new-wishlist-item", { written }, (data) => data.written.created).then(
      () => {
        createRemoteLinkStep(links)
      }
    )

    return new WorkflowResponse(written)
  }
)
