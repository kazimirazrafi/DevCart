import CustomerModule from "@medusajs/medusa/customer"
import { defineLink } from "@medusajs/framework/utils"

import WishlistModule from "../modules/wishlist"

/**
 * Customer to wishlist items. `isList` sits on the wishlist side: a customer
 * saves many products, a save belongs to one customer.
 */
export default defineLink(CustomerModule.linkable.customer, {
  linkable: WishlistModule.linkable.wishlistItem,
  isList: true,
})
