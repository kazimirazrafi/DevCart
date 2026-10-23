import CustomerModule from "@medusajs/medusa/customer"
import { defineLink } from "@medusajs/framework/utils"

import ReviewModule from "../modules/review"

/**
 * Customer → Reviews, with the same `isList` direction as the product link: a
 * customer writes many reviews, a review has one author.
 *
 * The link is what the storefront reads a reviewer's name through, and what
 * "one review per customer per product" is checked against.
 */
export default defineLink(CustomerModule.linkable.customer, {
  linkable: ReviewModule.linkable.review,
  isList: true,
})
