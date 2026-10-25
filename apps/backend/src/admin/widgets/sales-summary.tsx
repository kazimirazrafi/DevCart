import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Button, Container, Heading, Text } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { useMemo, useState } from "react"

import { formatMoney } from "../lib/format"
import { sdk } from "../lib/sdk"

type SalesSummary = {
  range: { from: string; to: string }
  order_count: number
  revenue: { currency_code: string; amount: number }[]
  top_products: {
    title: string
    quantity: number
    revenue_by_currency: Record<string, number>
  }[]
  truncated: boolean
}

const RANGES = [
  { days: 7, label: "Last 7 days" },
  { days: 30, label: "Last 30 days" },
  { days: 90, label: "Last 90 days" },
]

const DAY_MS = 24 * 60 * 60 * 1000

const rangeFor = (days: number) => {
  const to = new Date()
  const from = new Date(to.getTime() - (days - 1) * DAY_MS)

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  }
}

/** Revenue and best sellers for a window, read from the same orders the
 * Orders page lists. Totals are per currency, never summed across them. */
const SalesSummaryWidget = () => {
  const [days, setDays] = useState(30)
  const range = useMemo(() => rangeFor(days), [days])

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["sales-summary", days],
    queryFn: () =>
      sdk.client.fetch<SalesSummary>("/admin/sales-summary", {
        query: { from: range.from, to: range.to, limit: 5 },
      }),
  })

  return (
    <Container className="divide-y p-0" data-testid="sales-summary">
      <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-4">
        <div>
          <Heading level="h2">Sales</Heading>
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            {data
              ? `${data.order_count} order${data.order_count === 1 ? "" : "s"} placed in this window.`
              : "Revenue, orders and best sellers for a window."}
          </Text>
        </div>

        <div className="flex gap-2">
          {RANGES.map((option) => (
            <Button
              key={option.days}
              size="small"
              variant={option.days === days ? "primary" : "secondary"}
              onClick={() => setDays(option.days)}
              data-testid={`sales-range-${option.days}`}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="px-6 py-4">
          <Text size="small" className="text-ui-fg-subtle">
            Loading the figures…
          </Text>
        </div>
      )}

      {isError && (
        <div className="px-6 py-4">
          <Text size="small" className="text-ui-fg-error" data-testid="sales-error">
            {error instanceof Error
              ? error.message
              : "Could not load the sales summary."}
          </Text>
        </div>
      )}

      {data && !isError && (
        <>
          <div className="grid grid-cols-1 gap-6 px-6 py-4 small:grid-cols-3">
            <div className="flex flex-col gap-1">
              <Text size="small" leading="compact" className="text-ui-fg-subtle">
                Revenue
              </Text>
              {data.revenue.length === 0 ? (
                <Text size="large" weight="plus" data-testid="sales-revenue">
                  —
                </Text>
              ) : (
                data.revenue.map((entry) => (
                  <Text
                    key={entry.currency_code}
                    size="large"
                    weight="plus"
                    data-testid={`sales-revenue-${entry.currency_code}`}
                    data-value={entry.amount}
                  >
                    {formatMoney(entry.amount, entry.currency_code)}
                  </Text>
                ))
              )}
            </div>

            <div className="flex flex-col gap-1">
              <Text size="small" leading="compact" className="text-ui-fg-subtle">
                Orders
              </Text>
              <Text
                size="large"
                weight="plus"
                data-testid="sales-orders"
                data-value={data.order_count}
              >
                {data.order_count}
              </Text>
            </div>

            <div className="flex flex-col gap-1">
              <Text size="small" leading="compact" className="text-ui-fg-subtle">
                Window
              </Text>
              <Text size="small" leading="compact">
                {new Date(data.range.from).toLocaleDateString()} –{" "}
                {new Date(data.range.to).toLocaleDateString()}
              </Text>
            </div>
          </div>

          <div className="px-6 py-4">
            <Text size="small" weight="plus" leading="compact">
              Best sellers
            </Text>

            {data.top_products.length === 0 ? (
              <Text
                size="small"
                leading="compact"
                className="mt-2 text-ui-fg-subtle"
                data-testid="sales-no-products"
              >
                No orders in this window yet.
              </Text>
            ) : (
              <ul className="mt-3 flex flex-col gap-2" data-testid="sales-top-products">
                {data.top_products.map((product, index) => (
                  <li
                    key={product.title}
                    className="flex items-baseline justify-between gap-4"
                    data-testid="sales-top-product"
                  >
                    <Text size="small" leading="compact">
                      <span className="text-ui-fg-muted">
                        {String(index + 1).padStart(2, "0")}
                      </span>{" "}
                      {product.title}
                    </Text>
                    <Text size="small" leading="compact" className="shrink-0">
                      {product.quantity} sold
                      {Object.entries(product.revenue_by_currency)
                        .map(
                          ([currency, amount]) =>
                            ` · ${formatMoney(amount, currency)}`
                        )
                        .join("")}
                    </Text>
                  </li>
                ))}
              </ul>
            )}

            {data.truncated && (
              <Text size="xsmall" className="mt-3 text-ui-fg-subtle">
                This window holds more orders than one summary reads; pick a
                shorter range for exact figures.
              </Text>
            )}
          </div>
        </>
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.list.before",
})

export default SalesSummaryWidget
