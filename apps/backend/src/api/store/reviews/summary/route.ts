import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { REVIEW_MODULE } from "../../../../modules/review"
import ReviewModuleService from "../../../../modules/review/service"

/** Products in the homepage rail. */
const TOP_PRODUCTS = 6

/** Reviews a product needs before it counts as rated. */
const MIN_REVIEWS_FOR_TOP = 2

const round = (value: number) => Math.round(value * 10) / 10

/**
 * GET /store/reviews/summary
 * Catalogue-wide ratings from approved reviews, plus the best-rated products
 * for the homepage rail. Products below MIN_REVIEWS_FOR_TOP are left out.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const reviewService: ReviewModuleService = req.scope.resolve(REVIEW_MODULE)

  const approved = await reviewService.listReviews(
    { status: "approved" },
    { select: ["product_id", "rating"] }
  )

  const distribution = [1, 2, 3, 4, 5].reduce<Record<string, number>>(
    (counts, rating) => {
      counts[rating] = approved.filter((review) => review.rating === rating).length
      return counts
    },
    {}
  )

  const total = approved.reduce((sum, review) => sum + review.rating, 0)

  const byProduct = new Map<string, { total: number; count: number }>()

  for (const review of approved) {
    const current = byProduct.get(review.product_id) ?? { total: 0, count: 0 }
    current.total += review.rating
    current.count += 1
    byProduct.set(review.product_id, current)
  }

  const products = [...byProduct.entries()]
    .map(([product_id, stats]) => ({
      product_id,
      count: stats.count,
      average: round(stats.total / stats.count),
    }))
    .filter((product) => product.count >= MIN_REVIEWS_FOR_TOP)
    .sort((a, b) => b.average - a.average || b.count - a.count)
    .slice(0, TOP_PRODUCTS)

  res.json({
    count: approved.length,
    average: approved.length ? round(total / approved.length) : null,
    distribution,
    products,
  })
}
