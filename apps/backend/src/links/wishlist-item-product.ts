import ProductModule from "@medusajs/medusa/product"
import { defineLink } from "@medusajs/framework/utils"

import WishlistModule from "../modules/wishlist"

/** One product, many saves; each save is its own row. */
export default defineLink(ProductModule.linkable.product, {
  linkable: WishlistModule.linkable.wishlistItem,
  isList: true,
})
