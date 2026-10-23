import { MedusaService } from "@medusajs/framework/utils"

import { Review } from "./models/review"

/**
 * The review module's service. The generated CRUD (`createReviews`,
 * `listReviews`, `updateReviews`, …) is all this module needs: the rules that
 * belong to a review as a piece of business logic (product exists, one review
 * per customer per product) live in `workflows/create-product-review.ts`, so
 * they are the same whether a review arrives through the Store API, the admin,
 * or a script.
 */
class ReviewModuleService extends MedusaService({ Review }) {}

export default ReviewModuleService
