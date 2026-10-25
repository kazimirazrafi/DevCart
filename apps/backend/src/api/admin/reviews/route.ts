import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"

import { REVIEW_STATUSES } from "../../../modules/review/models/review"

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

const intParam = (
  value: unknown,
  fallback: number,
  min: number,
  max: number
) => {
  const parsed = Number.parseInt(String(value ?? ""), 10)

  if (Number.isNaN(parsed)) {
    return fallback
  }

  return Math.min(Math.max(parsed, min), max)
}

/**
 * GET /admin/reviews
 * The moderation queue, newest first, optionally filtered by product or status.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const limit = intParam(req.query.limit, DEFAULT_LIMIT, 1, MAX_LIMIT)
  const offset = intParam(req.query.offset, 0, 0, Number.MAX_SAFE_INTEGER)

  const filters: Record<string, unknown> = {}

  if (req.query.product_id) {
    filters.product_id = req.query.product_id
  }

  if (req.query.status) {
    const status = String(req.query.status)

    if (!REVIEW_STATUSES.includes(status as (typeof REVIEW_STATUSES)[number])) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Unknown review status: ${status}.`
      )
    }

    filters.status = status
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data, metadata } = await query.graph({
    entity: "review",
    fields: [
      "id",
      "product_id",
      "customer_id",
      "rating",
      "title",
      "body",
      "status",
      "created_at",
      "customer.first_name",
      "customer.last_name",
    ],
    filters,
    pagination: {
      skip: offset,
      take: limit,
      order: { created_at: "DESC" },
    },
  })

  res.json({
    reviews: data,
    count: metadata?.count ?? data.length,
    limit,
    offset,
  })
}
