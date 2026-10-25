import { model } from "@medusajs/framework/utils"

/** A product review. product_id and customer_id are plain columns; the module
 * links are what let the Query API join them. Reviews start as pending and stay
 * off the storefront until approved. */
export const REVIEW_STATUSES = ["pending", "approved", "rejected"] as const

export type ReviewStatus = (typeof REVIEW_STATUSES)[number]

export const Review = model.define("review", {
  id: model.id().primaryKey(),
  product_id: model.text(),
  customer_id: model.text(),
  rating: model.number(),
  title: model.text(),
  body: model.text(),
  status: model.enum([...REVIEW_STATUSES]).default("pending"),
})
