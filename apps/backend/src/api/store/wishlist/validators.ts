import { z } from "@medusajs/framework/zod"

/**
 * `customer_id` is never accepted: a save belongs to whoever is signed in.
 * `variant_id` is optional, since the product page saves the product itself.
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
