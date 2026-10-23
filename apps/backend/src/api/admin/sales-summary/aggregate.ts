/**
 * Turning a list of orders into the numbers a dashboard shows.
 *
 * Pure on purpose: the arithmetic is the part that can be wrong in a way that
 * looks plausible (a revenue that quietly includes a cancelled order, a top
 * product list that sorts by the wrong thing), so it is tested without an API.
 */

export type FulfillmentForSummary = {
  shipped_at?: string | null
  canceled_at?: string | null
}

export type OrderForSummary = {
  id: string
  total?: number | string | bigint | null
  currency_code?: string | null
  /** When the order was placed, for the dashboard's per-day series. */
  created_at?: string | null
  /** Who placed it, for the new-versus-returning customer split. */
  customer_id?: string | null
  items?:
    | {
        product_id?: string | null
        product_title?: string | null
        quantity?: number | string | null
        total?: number | string | null
      }[]
    | null
  /**
   * Present only when the read asked for it; see `readOrdersInRange`.
   */
  fulfillments?: FulfillmentForSummary[] | null
}

export type SalesSummary = {
  order_count: number
  revenue: { currency_code: string; amount: number }[]
  top_products: {
    product_id: string | null
    title: string
    quantity: number
    revenue_by_currency: Record<string, number>
  }[]
}

const money = (value: unknown): number => {
  const amount = Number(value ?? 0)

  if (!Number.isFinite(amount)) {
    return 0
  }

  // Currency amounts with a float tail ("1234.5600000000002") are noise, not
  // money; two decimals is what a price can carry.
  return Math.round(amount * 100) / 100
}

const currencyOf = (order: OrderForSummary) =>
  (order.currency_code || "eur").toLowerCase()

/**
 * One currency's revenue cannot be added to another's, so revenue is reported
 * per currency rather than as a single figure. The store's catalogue is priced
 * in more than one currency, and a total that silently mixed them would be
 * wrong in a way nobody would notice until it mattered.
 */
export const summariseSales = (
  orders: OrderForSummary[],
  { limit = 5 }: { limit?: number } = {}
): SalesSummary => {
  const revenueByCurrency = new Map<string, number>()
  const products = new Map<
    string,
    {
      product_id: string | null
      title: string
      quantity: number
      revenue: Map<string, number>
    }
  >()

  for (const order of orders) {
    const currency = currencyOf(order)
    revenueByCurrency.set(
      currency,
      money((revenueByCurrency.get(currency) ?? 0) + money(order.total))
    )

    for (const item of order.items ?? []) {
      const title = item.product_title?.trim()

      if (!title) {
        continue
      }

      const quantity = Number(item.quantity ?? 0)
      // Keyed by product when the order knows it, so two products that share a
      // title stay two rows; the title is the fallback for an order placed
      // before the product existed.
      const key = item.product_id || title
      const entry = products.get(key) ?? {
        product_id: item.product_id ?? null,
        title,
        quantity: 0,
        revenue: new Map<string, number>(),
      }

      entry.quantity += Number.isFinite(quantity) ? quantity : 0
      entry.revenue.set(
        currency,
        money((entry.revenue.get(currency) ?? 0) + money(item.total))
      )

      products.set(key, entry)
    }
  }

  const top = Array.from(products.values())
    .map((entry) => ({
      product_id: entry.product_id,
      title: entry.title,
      quantity: entry.quantity,
      revenue_by_currency: Object.fromEntries(entry.revenue),
    }))
    // Most units first — a "top products" list is about what moved. Ties go to
    // the product that brought in more, then to the title, so the same data
    // always produces the same order.
    .sort((a, b) => {
      if (b.quantity !== a.quantity) {
        return b.quantity - a.quantity
      }

      const revenueOf = (entry: typeof a) =>
        Object.values(entry.revenue_by_currency).reduce(
          (sum, amount) => sum + amount,
          0
        )

      const byRevenue = revenueOf(b) - revenueOf(a)

      return byRevenue !== 0 ? byRevenue : a.title.localeCompare(b.title)
    })
    .slice(0, Math.max(0, limit))

  return {
    order_count: orders.length,
    revenue: Array.from(revenueByCurrency.entries())
      .map(([currency_code, amount]) => ({ currency_code, amount }))
      .sort((a, b) => b.amount - a.amount),
    top_products: top,
  }
}

/**
 * Whether everything the order asked to be sent has left the warehouse.
 *
 * Medusa reports the same thing as an order's `fulfillment_status`, but it
 * computes that while serializing an order and does not let it be filtered on,
 * so the same rule is applied here to the shipments themselves: an order with
 * no fulfillment has shipped nothing, and a cancelled fulfillment is not going
 * to ship — it is left out rather than held against the order forever.
 */
export const isShipped = (order: OrderForSummary): boolean => {
  const live = (order.fulfillments ?? []).filter(
    (fulfillment) => !fulfillment.canceled_at
  )

  return live.length > 0 && live.every((fulfillment) => Boolean(fulfillment.shipped_at))
}

/**
 * How many of these orders still owe the customer a shipment.
 *
 * Only meaningful on orders read with `withFulfillments` — without the
 * shipments every order looks unshipped.
 */
export const countUnshipped = (orders: OrderForSummary[]): number =>
  orders.filter((order) => !isShipped(order)).length
