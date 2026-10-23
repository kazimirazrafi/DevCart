import { z } from "@medusajs/framework/zod"

/**
 * The body a customer may send. Nothing here can set `customer_id`: a save
 * always belongs to whoever is signed in, so one customer cannot write into
 * another's wishlist.
 *
 * `variant_id` is optional and may be sent as an explicit empty value — the
 * product page saves the product, not a variant, and the account page's own
 * panel has no variant to offer.
 */
export const StoreAddWishlistItemSchema = z.object({
  product_id: z
    .string({ error: "Choose a product to save." })
    .trim()
    .min(1, "Choose a product to save."),
  variant_id: z
    .string({ error: "Choose a valid variant." })
    .trim()
    .min(1, "Choose a valid variant.")
    .optional()
    .nullable(),
})

export type StoreAddWishlistItemBody = z.infer<
  typeof StoreAddWishlistItemSchema
>
