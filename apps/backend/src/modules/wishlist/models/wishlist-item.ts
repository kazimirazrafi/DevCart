import { model } from "@medusajs/framework/utils"

/** A product a customer saved. ids are plain columns joined back through the
 * module links. variant_id is optional and has no foreign key, so deleting a
 * variant does not remove the saved product. The unique index keeps a customer
 * to one row per product. */
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
