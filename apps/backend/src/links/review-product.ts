import ProductModule from "@medusajs/medusa/product"
import { defineLink } from "@medusajs/framework/utils"

import ReviewModule from "../modules/review"

/**
 * Product to reviews. `isList` on the review side: one product has many reviews,
 * a review belongs to one product.
 */
export default defineLink(ProductModule.linkable.product, {
  linkable: ReviewModule.linkable.review,
  isList: true,
})
