import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { getOrdersListWorkflow } from "@medusajs/medusa/core-flows"

import { REVIEW_MODULE } from "../../../modules/review"
import type ReviewModuleService from "../../../modules/review/service"
import {
  inventoryItemTitle,
  lowStockLevels,
  readThreshold,
  type LowStockLine,
} from "../../../modules/stock-alert/low-stock"
import { countUnshipped, summariseSales } from "../sales-summary/aggregate"
import { readRange } from "../sales-summary/range"
import { readOrdersInRange } from "../sales-summary/read-orders"
import {
  alignTo,
  bucketOrdersByDay,
  percentChange,
  revenueSeries,
} from "./series"

/** How many rows of a list the dashboard shows before it becomes a page. */
const LIST_LIMIT = 5

/** How many ids one customer filter carries; longer lists are asked in parts. */
const ID_CHUNK = 500

const RATINGS = [1, 2, 3, 4, 5]

type InventoryItemRow = {
  id: string
  sku?: string | null
  title?: string | null
  location_levels?:
    | {
        location_id?: string | null
        stocked_quantity?: number | null
        reserved_quantity?: number | null
      }[]
    | null
  variants?:
    | {
        title?: string | null
        product?: { title?: string | null } | null
      }[]
    | null
}

type RecentOrder = {
  id: string
  display_id?: number | null
  email?: string | null
  total?: number | string | bigint | null
  currency_code?: string | null
  created_at: string
  status?: string | null
  /**
   * Computed by `getOrdersListWorkflow` from the order's payment collections
   * and fulfillments — the same numbers the Orders page shows, which cannot be
   * asked of the Query API directly.
   */
  payment_status?: string | null
  fulfillment_status?: string | null
}

const chunk = <T,>(items: T[], size: number): T[][] => {
  const chunks: T[][] = []

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }

  return chunks
}

/**
 * Everything the admin's home screen reports, in one request.
 *
 * The figures are read through the Query API and the module services rather
 * than written in SQL, so they agree with the pages an admin can open from
 * them: the revenue here and the totals in the order list are the same numbers.
 * The dashboard makes one call instead of six because the six together answer
 * one question, and a page that arrives in pieces shows six different moments
 * of the shop.
 *
 * Counts come from the modules' `listAndCount` rather than from the Query API's
 * pagination metadata: the graph only reports a total when it has to filter
 * across modules, and everywhere else hands back the rows it was asked for. A
 * count taken from a page of rows would be the page size, which is a number
 * that looks right and is not.
 *
 * The charts need the window as a sequence, so the same read that produces the
 * totals is bucketed into days (`series.ts`). The window immediately before it
 * is read too — a figure with no baseline is a number nobody can act on — and
 * its days are aligned index by index with this window's, so the comparison
 * line is drawn against the same weekday positions rather than against dates
 * that shift under it.
 *
 * Reviews and stock are counted across all time: a window would drop the
 * oldest, and the oldest are precisely the ones that have been forgotten.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  // `readRange` raises a `MedusaError` with `INVALID_DATA` for a bad or
  // oversized window, which the framework answers as a 400.
  const range = readRange(req.query.from, req.query.to)

  const span = range.to.getTime() - range.from.getTime()
  const previousRange = {
    from: new Date(range.from.getTime() - span),
    to: new Date(range.from.getTime() - 1),
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const customerService = req.scope.resolve(Modules.CUSTOMER)
  const productService = req.scope.resolve(Modules.PRODUCT)
  const reviewService: ReviewModuleService = req.scope.resolve(REVIEW_MODULE)
  const threshold = readThreshold(process.env.LOW_STOCK_THRESHOLD)

  const [
    { orders, truncated },
    { orders: previousOrders },
    [, customerCount],
    [, newCustomerCount],
    [, previousCustomerCount],
    [pendingReviews, pendingReviewCount],
    approvedRatingCounts,
    inventory,
    recentOrders,
  ] = await Promise.all([
    // The window's orders, with their shipments: one read answers both the
    // sales figures and how many of them still owe the customer a parcel.
    readOrdersInRange(req, range, { withFulfillments: true }),
    readOrdersInRange(req, previousRange),
    customerService.listAndCountCustomers({}, { take: 1, select: ["id"] }),
    customerService.listAndCountCustomers(
      {
        created_at: {
          $gte: range.from.toISOString(),
          $lte: range.to.toISOString(),
        },
      },
      { take: 1, select: ["id"] }
    ),
    customerService.listAndCountCustomers(
      {
        created_at: {
          $gte: previousRange.from.toISOString(),
          $lte: previousRange.to.toISOString(),
        },
      },
      { take: 1, select: ["id"] }
    ),
    reviewService.listAndCountReviews(
      { status: "pending" },
      {
        take: LIST_LIMIT,
        order: { created_at: "DESC" },
        select: ["id", "product_id", "rating", "title", "created_at"],
      }
    ),
    // One count per star: the satisfaction card shows the distribution, and
    // five small counts are cheaper than reading every approved review.
    Promise.all(
      RATINGS.map((rating) =>
        reviewService
          .listAndCountReviews(
            { status: "approved", rating },
            { take: 1, select: ["id"] }
          )
          .then(([, count]) => count)
      )
    ),
    query.graph({
      entity: "inventory_item",
      fields: [
        "id",
        "sku",
        "title",
        "location_levels.location_id",
        "location_levels.stocked_quantity",
        "location_levels.reserved_quantity",
        "variants.title",
        "variants.product.title",
      ],
    }),
    // The orders list's own workflow, so the status badges below are the ones
    // the Orders page would show for the same order rather than a second
    // reading of the same payments and shipments.
    getOrdersListWorkflow(req.scope)
      .run({
        input: {
          fields: [
            "id",
            "display_id",
            "email",
            "total",
            "currency_code",
            "created_at",
            "status",
          ],
          variables: { take: LIST_LIMIT, order: { created_at: "DESC" } },
        },
      })
      .then(({ result }) => (Array.isArray(result) ? result : result.rows)),
  ])

  // One row per inventory level, named the way an admin would recognise the
  // product, lowest stock first — the list is a work queue, so the item about
  // to run out is the one worth opening.
  const lowStock: LowStockLine[] = (
    inventory.data as unknown as InventoryItemRow[]
  )
    .flatMap((item) => {
      const title = inventoryItemTitle(item)

      return lowStockLevels(item, threshold).map((line) => ({
        ...line,
        title: title ?? line.title,
      }))
    })
    .sort((a, b) => a.available - b.available)

  // A review names its product by ID, and the ID is not what an admin reads;
  // the titles for the handful on screen are one extra read.
  const productIds = Array.from(
    new Set(pendingReviews.map((review) => review.product_id))
  )
  const products = productIds.length
    ? await productService.listProducts(
        { id: productIds },
        { select: ["id", "title"] }
      )
    : []
  const productTitles = new Map(
    products.map((product) => [product.id, product.title])
  )

  /*
   * A returning customer is one who ordered in this window and already existed
   * when it opened. The new ones are counted by creation date above; the rest
   * are these, asked in parts so one long window cannot build a filter with
   * thousands of ids in it.
   */
  const windowCustomerIds = Array.from(
    new Set(
      orders
        .map((order) => order.customer_id)
        .filter((id): id is string => Boolean(id))
    )
  )
  const returningInRange = (
    await Promise.all(
      chunk(windowCustomerIds, ID_CHUNK).map((ids) =>
        customerService
          .listAndCountCustomers(
            { id: ids, created_at: { $lt: range.from.toISOString() } },
            { take: 1, select: ["id"] }
          )
          .then(([, count]) => count)
      )
    )
  ).reduce((sum, count) => sum + count, 0)

  const sales = summariseSales(orders, { limit: LIST_LIMIT })
  const previousSales = summariseSales(previousOrders, { limit: 0 })

  const dailyBuckets = bucketOrdersByDay(orders, range.from, range.to)
  const previousDailyBuckets = bucketOrdersByDay(
    previousOrders,
    previousRange.from,
    previousRange.to
  )

  const currencies = Array.from(
    new Set([
      ...sales.revenue.map((entry) => entry.currency_code),
      ...previousSales.revenue.map((entry) => entry.currency_code),
    ])
  )
  const dates = dailyBuckets.map((bucket) => bucket.date)

  const approvedCount = approvedRatingCounts.reduce((sum, count) => sum + count, 0)
  const ratingTotal = approvedRatingCounts.reduce(
    (sum, count, index) => sum + count * RATINGS[index],
    0
  )

  res.json({
    range: {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
    },
    previous: {
      from: previousRange.from.toISOString(),
      to: previousRange.to.toISOString(),
      order_count: previousSales.order_count,
      revenue: previousSales.revenue,
      new_customers: previousCustomerCount,
    },
    series: {
      dates,
      orders: dailyBuckets.map((bucket) => bucket.orders),
      revenue: revenueSeries(dailyBuckets, currencies),
      previous_orders: alignTo(
        previousDailyBuckets.map((bucket) => bucket.orders),
        dates.length
      ),
      previous_revenue: Object.fromEntries(
        Object.entries(
          revenueSeries(previousDailyBuckets, currencies)
        ).map(([currency, values]) => [currency, alignTo(values, dates.length)])
      ),
    },
    sales: {
      ...sales,
      truncated,
    },
    deltas: {
      revenue: Object.fromEntries(
        sales.revenue.map((entry) => [
          entry.currency_code,
          percentChange(
            entry.amount,
            previousSales.revenue.find(
              (previous) => previous.currency_code === entry.currency_code
            )?.amount ?? 0
          ),
        ])
      ),
      orders: percentChange(sales.order_count, previousSales.order_count),
      new_customers: percentChange(newCustomerCount, previousCustomerCount),
    },
    customers: {
      total: customerCount,
      new_in_range: newCustomerCount,
      returning_in_range: returningInRange,
    },
    fulfillment: {
      unshipped_orders: countUnshipped(orders),
    },
    reviews: {
      pending_count: pendingReviewCount,
      pending: pendingReviews.map((review) => ({
        id: review.id,
        product_id: review.product_id,
        product_title: productTitles.get(review.product_id) ?? null,
        rating: review.rating,
        title: review.title ?? null,
        created_at: review.created_at,
      })),
      approved_count: approvedCount,
      average_rating:
        approvedCount === 0
          ? null
          : Math.round((ratingTotal / approvedCount) * 10) / 10,
      rating_breakdown: RATINGS.map((rating, index) => ({
        rating,
        count: approvedRatingCounts[index],
      })),
    },
    stock: {
      threshold,
      low_count: lowStock.length,
      items: lowStock.slice(0, LIST_LIMIT),
    },
    recent_orders: (recentOrders as unknown as RecentOrder[]).map((order) => ({
      id: order.id,
      display_id: order.display_id ?? null,
      email: order.email ?? null,
      total: Number(order.total ?? 0),
      currency_code: order.currency_code ?? "eur",
      created_at: order.created_at,
      status: order.status ?? null,
      payment_status: order.payment_status ?? null,
      fulfillment_status: order.fulfillment_status ?? null,
    })),
  })
}
