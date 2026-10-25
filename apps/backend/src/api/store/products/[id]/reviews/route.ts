import type {
  AuthenticatedMedusaRequest,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { REVIEW_MODULE } from "../../../../../modules/review"
import ReviewModuleService from "../../../../../modules/review/service"
import { createProductReviewWorkflow } from "../../../../../workflows/create-product-review"
import type { StoreCreateReviewBody } from "./validators"

const DEFAULT_LIMIT = 10
const MAX_LIMIT = 50

type ReviewRow = {
  id: string
  rating: number
  title: string | null
  body: string | null
  created_at: string | Date
  customer?: {
    first_name?: string | null
    last_name?: string | null
  } | null
}

/** First name and last initial; customer rows are not always complete. */
const publicName = (customer?: ReviewRow["customer"]) => {
  const first = customer?.first_name?.trim()
  const last = customer?.last_name?.trim()

  if (!first && !last) {
    return "Customer"
  }

  if (!first) {
    return last as string
  }

  return last ? `${first} ${last.charAt(0).toUpperCase()}.` : first
}

const intParam = (value: unknown, fallback: number, min: number, max: number) => {
  const parsed = Number.parseInt(String(value ?? ""), 10)

  if (Number.isNaN(parsed)) {
    return fallback
  }

  return Math.min(Math.max(parsed, min), max)
}

/**
 * GET /store/products/:id/reviews
 * Approved reviews, newest first, paginated. `summary` covers the whole
 * product, not the current page.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const productId = req.params.id
  const limit = intParam(req.query.limit, DEFAULT_LIMIT, 1, MAX_LIMIT)
  const offset = intParam(req.query.offset, 0, 0, Number.MAX_SAFE_INTEGER)

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data, metadata } = await query.graph({
    entity: "review",
    fields: [
      "id",
      "rating",
      "title",
      "body",
      "created_at",
      "customer.first_name",
      "customer.last_name",
    ],
    filters: {
      product_id: productId,
      status: "approved",
    },
    pagination: {
      skip: offset,
      take: limit,
      order: { created_at: "DESC" },
    },
  })

  const reviews = (data as ReviewRow[]).map((review) => ({
    id: review.id,
    rating: review.rating,
    title: review.title,
    body: review.body,
    created_at: review.created_at,
    author_name: publicName(review.customer),
  }))

  const reviewService: ReviewModuleService = req.scope.resolve(REVIEW_MODULE)
  const approved = await reviewService.listReviews(
    { product_id: productId, status: "approved" },
    { select: ["rating"] }
  )

  const distribution = [1, 2, 3, 4, 5].reduce<Record<string, number>>(
    (counts, rating) => {
      counts[rating] = approved.filter((r) => r.rating === rating).length
      return counts
    },
    {}
  )

  const average =
    approved.length === 0
      ? 0
      : approved.reduce((sum, r) => sum + r.rating, 0) / approved.length

  res.json({
    reviews,
    count: metadata?.count ?? reviews.length,
    limit,
    offset,
    summary: {
      count: approved.length,
      average: Math.round(average * 10) / 10,
      distribution,
    },
  })
}

/**
 * POST /store/products/:id/reviews
 * Authenticated and moderated: the review is written as `pending`.
 */
export async function POST(
  req: AuthenticatedMedusaRequest<StoreCreateReviewBody>,
  res: MedusaResponse
) {
  const customerId = req.auth_context?.actor_id

  const { result: review } = await createProductReviewWorkflow(req.scope).run({
    input: {
      product_id: req.params.id,
      customer_id: customerId as string,
      rating: req.validatedBody.rating,
      title: req.validatedBody.title,
      body: req.validatedBody.body,
    },
  })

  res.status(201).json({ review })
}
