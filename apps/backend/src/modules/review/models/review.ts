import { model } from "@medusajs/framework/utils"

/**
 * A product review written by a customer.
 *
 * `product_id` and `customer_id` are plain columns on purpose: the module owns
 * no product or customer data, and the two module links (`links/review-product`
 * and `links/review-customer`) are what let the Query API join them back.
 *
 * `status` starts at `pending` — a review is invisible on the storefront until
 * an admin approves it, which is the moderation the spec asks for.
 *
 * `created_at` / `updated_at` are the framework's own columns on every model.
 */
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
