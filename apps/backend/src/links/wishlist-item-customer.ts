import CustomerModule from "@medusajs/medusa/customer"
import { defineLink } from "@medusajs/framework/utils"

import WishlistModule from "../modules/wishlist"

/**
 * Customer → Wishlist items.
 *
 * `isList` belongs on the wishlist side, the same direction the review links
 * take (see `links/review-customer.ts`): a customer saves many products, and a
 * saved product belongs to one customer. On the customer side it would mean one
 * saved product could belong to many customers, and the link service would
 * refuse the second customer's row.
 */
export default defineLink(CustomerModule.linkable.customer, {
  linkable: WishlistModule.linkable.wishlistItem,
  isList: true,
})
