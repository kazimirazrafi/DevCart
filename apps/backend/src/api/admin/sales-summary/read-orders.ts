import type { MedusaRequest } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import type { OrderForSummary } from "./aggregate"

const ORDER_FIELDS = [
  "id",
  "total",
  "currency_code",
  "created_at",
  "customer_id",
  "status",
  "items.product_id",
  "items.product_title",
  "items.quantity",
  "items.total",
]

/** The shipments an order has, for counting how many still have to go out. */
const FULFILLMENT_FIELDS = [
  "fulfillments.shipped_at",
  "fulfillments.canceled_at",
]

/** One page of orders per read; a year of a busy shop is a handful of these. */
const PAGE_SIZE = 500
/** Enough for 20,000 orders in the window — beyond that the answer says so. */
const MAX_PAGES = 40

/**
 * Every order in a window, read through the Query API in pages.
 *
 * The caller sums these in memory rather than in SQL: the numbers have to agree
 * with the orders an admin can open, including their currency, and a hand
 * written aggregate would have to repeat every rule about which orders count.
 *
 * Draft and cancelled orders are excluded — they were never revenue.
 * `truncated` is honest about the read's ceiling rather than returning a total
 * that silently stops at 20,000 orders.
 */
export const readOrdersInRange = async (
  req: MedusaRequest,
  range: { from: Date; to: Date },
  { withFulfillments = false }: { withFulfillments?: boolean } = {}
): Promise<{ orders: OrderForSummary[]; truncated: boolean }> => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const orders: OrderForSummary[] = []
  let truncated = false

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const { data } = await query.graph({
      entity: "order",
      fields: withFulfillments
        ? [...ORDER_FIELDS, ...FULFILLMENT_FIELDS]
        : ORDER_FIELDS,
      filters: {
        created_at: {
          $gte: range.from.toISOString(),
          $lte: range.to.toISOString(),
        },
        status: { $nin: ["canceled", "draft"] },
      },
      pagination: { skip: page * PAGE_SIZE, take: PAGE_SIZE },
    })

    orders.push(...(data as unknown as OrderForSummary[]))

    if (data.length < PAGE_SIZE) {
      break
    }

    if (page === MAX_PAGES - 1) {
      truncated = true
    }
  }

  return { orders, truncated }
}
