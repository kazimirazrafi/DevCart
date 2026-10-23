import ProductModule from "@medusajs/medusa/product"
import { defineLink } from "@medusajs/framework/utils"

import WishlistModule from "../modules/wishlist"

/**
 * Product → Wishlist items, with the same `isList` direction as the customer
 * link: one product may be saved by many customers, and each save is its own
 * row.
 */
export default defineLink(ProductModule.linkable.product, {
  linkable: WishlistModule.linkable.wishlistItem,
  isList: true,
})
