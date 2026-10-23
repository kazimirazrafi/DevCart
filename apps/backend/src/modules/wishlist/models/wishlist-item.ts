import { model } from "@medusajs/framework/utils"

/**
 * One product a customer has saved for later.
 *
 * `customer_id`, `product_id` and `variant_id` are plain columns: the module
 * owns no customer or product data, and the two module links
 * (`links/wishlist-item-customer`, `links/wishlist-item-product`) are what let
 * the Query API join them back.
 *
 * `variant_id` is a preference, not a requirement — a saved product usually has
 * no variant chosen yet, and a variant that is later deleted must not take the
 * saved product with it. It is `nullable` for the first case and has no foreign
 * key for the second.
 *
 * The unique index is the rule "a customer saves a product once": the add
 * workflow upserts against it, so tapping the heart twice cannot produce two
 * rows even if two requests overlap.
 */
export const WishlistItem = model.define("wishlist_item", {
  id: model.id().primaryKey(),
  customer_id: model.text(),
  product_id: model.text(),
  variant_id: model.text().nullable(),
}).indexes([
  {
    on: ["customer_id", "product_id"],
    unique: true,
  },
])
