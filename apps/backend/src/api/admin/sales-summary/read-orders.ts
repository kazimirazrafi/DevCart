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

/** One page per read. */
const PAGE_SIZE = 500
/** Ceiling of 20,000 orders per window; past that `truncated` is set. */
const MAX_PAGES = 40

/**
 * Every order in a window, paged through the Query API. Drafts and cancellations
 * are excluded; `truncated` reports the read's ceiling rather than hiding it.
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
