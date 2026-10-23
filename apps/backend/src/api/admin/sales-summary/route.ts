import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { summariseSales } from "./aggregate"
import { readRange } from "./range"
import { readOrdersInRange } from "./read-orders"

const DEFAULT_TOP_PRODUCTS = 5
const MAX_TOP_PRODUCTS = 20

const intParam = (value: unknown, fallback: number, min: number, max: number) => {
  const parsed = Number.parseInt(String(value ?? ""), 10)

  if (Number.isNaN(parsed)) {
    return fallback
  }

  return Math.min(Math.max(parsed, min), max)
}

/**
 * GET /admin/sales-summary?from=&to=&limit=
 *
 * Revenue, order count and the best-selling products for a window, summed from
 * the orders `readOrdersInRange` returns. Everything except drafts and
 * cancellations is revenue, whatever its fulfillment or payment state, because
 * the total is what the customer was charged; the order list is where an
 * unpaid order is chased.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  // `readRange` raises a `MedusaError` with `INVALID_DATA`, which the framework
  // answers as a 400 with its message — the same shape as every other route.
  const range = readRange(req.query.from, req.query.to)

  const limit = intParam(
    req.query.limit,
    DEFAULT_TOP_PRODUCTS,
    1,
    MAX_TOP_PRODUCTS
  )

  const { orders, truncated } = await readOrdersInRange(req, range)

  res.json({
    range: {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
    },
    ...summariseSales(orders, { limit }),
    truncated,
  })
}
