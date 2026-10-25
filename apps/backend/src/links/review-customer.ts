import CustomerModule from "@medusajs/medusa/customer"
import { defineLink } from "@medusajs/framework/utils"

import ReviewModule from "../modules/review"

/**
 * Customer to reviews. The storefront reads reviewer names through this link,
 * and "one review per customer per product" is checked against it.
 */
export default defineLink(CustomerModule.linkable.customer, {
  linkable: ReviewModule.linkable.review,
  isList: true,
})
