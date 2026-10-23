import ProductModule from "@medusajs/medusa/product"
import { defineLink } from "@medusajs/framework/utils"

import ReviewModule from "../modules/review"

/**
 * Product → Reviews.
 *
 * `isList` belongs on the review side: it says one product may be linked to
 * many reviews, which is the direction a review list reads. (On the product
 * side it would mean one review could belong to many products, and the link
 * service refuses the second review of the same product.)
 */
export default defineLink(ProductModule.linkable.product, {
  linkable: ReviewModule.linkable.review,
  isList: true,
})
