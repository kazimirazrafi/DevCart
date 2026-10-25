import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ChartBar } from "@medusajs/icons"
import { Badge, Button, Container, Heading, Table, Text } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { compactMoney, formatMoney } from "../../lib/format"
import { sdk } from "../../lib/sdk"

type Money = { currency_code: string; amount: number }

type TopProduct = {
  product_id: string | null
  title: string
  quantity: number
  revenue_by_currency: Record<string, number>
}

type PendingReview = {
  id: string
  product_id: string
  product_title: string | null
  rating: number
  title: string | null
  created_at: string
}

type Dashboard = {
  range: { from: string; to: string }
  previous: {
    from: string
    to: string
    order_count: number
    revenue: Money[]
    new_customers: number
  }
  series: {
    dates: string[]
    orders: number[]
    revenue: Record<string, number[]>
    previous_orders: number[]
    previous_revenue: Record<string, number[]>
  }
  sales: {
    order_count: number
    revenue: Money[]
    top_products: TopProduct[]
    truncated: boolean
  }
  deltas: {
    revenue: Record<string, number | null>
    orders: number | null
    new_customers: number | null
  }
  customers: {
    total: number
    new_in_range: number
    returning_in_range: number
  }
  fulfillment: { unshipped_orders: number }
  reviews: {
    pending_count: number
    pending: PendingReview[]
    approved_count: number
    average_rating: number | null
    rating_breakdown: { rating: number; count: number }[]
  }
  stock: {
    threshold: number
    low_count: number
    items: {
      inventory_item_id: string
      title: string | null
      sku: string | null
      location_id: string
      available: number
    }[]
  }
  recent_orders: {
    id: string
    display_id: number | null
    email: string | null
    total: number
    currency_code: string
    created_at: string
    status: string | null
    payment_status: string | null
    fulfillment_status: string | null
  }[]
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

/* Day keys come from the API as YYYY-MM-DD in UTC, never from a parsed
 * date, so a label cannot shift a day in a western timezone. */
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]

const dayLabel = (iso: string) => {
  const [, month, day] = iso.split("-")

  return `${MONTHS[Number(month) - 1] ?? month} ${Number(day) || day}`
}

const SERIES_COLOR = "var(--fg-interactive)"
const COMPARISON_COLOR = "var(--fg-subtle)"
const GRID_COLOR = "var(--border-base)"
const AXIS_COLOR = "var(--fg-muted)"
const SECOND_SLICE_COLOR = "var(--border-strong)"

type BadgeColor = "green" | "orange" | "red" | "blue" | "purple" | "grey"

/** Money in is green, money still owed orange, cancelled red. */
const PAYMENT_COLORS: Record<string, BadgeColor> = {
  captured: "green",
  paid: "green",
  authorized: "blue",
  awaiting: "orange",
  partially_refunded: "purple",
  refunded: "grey",
  canceled: "red",
}

const FULFILLMENT_COLORS: Record<string, BadgeColor> = {
  fulfilled: "green",
  shipped: "green",
  delivered: "green",
  not_fulfilled: "orange",
  partially_fulfilled: "blue",
  partially_shipped: "blue",
  requires_action: "orange",
  canceled: "red",
}

const label = (value: string | null) =>
  value ? value.replace(/_/g, " ") : "unknown"

const Stars = ({ rating }: { rating: number }) => (
  <span aria-label={`${rating} out of 5 stars`} title={`${rating} out of 5`}>
    {"★".repeat(rating)}
    <span className="text-ui-fg-muted">{"★".repeat(5 - rating)}</span>
  </span>
)

/** Change against the previous window. An arrow, not a colour: a rise is
 * not always good news. */
const Delta = ({ value }: { value: number | null }) => {
  if (value === null) {
    return (
      <Text size="xsmall" leading="compact" className="text-ui-fg-muted">
        no earlier window
      </Text>
    )
  }

  return (
    <Text
      size="xsmall"
      leading="compact"
      className={value < 0 ? "text-ui-fg-error" : "text-ui-fg-subtle"}
    >
      {value > 0 ? "▲" : value < 0 ? "▼" : "—"} {Math.abs(value)}%
    </Text>
  )
}

const Kpi = ({
  title,
  hint,
  delta,
  children,
}: {
  title: string
  hint?: string
  delta?: number | null
  children: React.ReactNode
}) => (
  <Container className="flex flex-col gap-y-1 px-6 py-4">
    <div className="flex items-start justify-between gap-2">
      <Text size="small" leading="compact" className="text-ui-fg-subtle">
        {title}
      </Text>
      {delta !== undefined && <Delta value={delta} />}
    </div>
    {children}
    {hint && (
      <Text size="xsmall" leading="compact" className="text-ui-fg-muted">
        {hint}
      </Text>
    )}
  </Container>
)

const SectionHeader = ({
  title,
  hint,
  action,
}: {
  title: string
  hint?: string
  action?: React.ReactNode
}) => (
  <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-4">
    <div>
      <Heading level="h2">{title}</Heading>
      {hint && (
        <Text size="small" leading="compact" className="text-ui-fg-subtle">
          {hint}
        </Text>
      )}
    </div>
    {action}
  </div>
)

const TextLink = ({
  to,
  children,
}: {
  to: string
  children: React.ReactNode
}) => (
  <Link
    to={to}
    className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover text-sm font-medium"
  >
    {children}
  </Link>
)

type Point = { date: string; current: number; previous: number }

type TooltipEntry = { dataKey?: string | number; value?: number }

const RevenueTooltip = ({
  active,
  payload,
  label: day,
  currency,
}: {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string | number
  currency: string
}) => {
  if (!active || !payload?.length) {
    return null
  }

  const of = (key: string) =>
    payload.find((entry) => entry.dataKey === key)?.value ?? 0

  return (
    <div className="bg-ui-bg-base border-ui-border-base flex flex-col gap-y-1 rounded-md border px-3 py-2 shadow-md">
      <Text size="xsmall" leading="compact" className="text-ui-fg-subtle">
        {dayLabel(String(day ?? ""))}
      </Text>
      <Text size="xsmall" leading="compact">
        {formatMoney(of("current"), currency)} this period
      </Text>
      <Text size="xsmall" leading="compact" className="text-ui-fg-subtle">
        {formatMoney(of("previous"), currency)} previous period
      </Text>
    </div>
  )
}

/** Revenue per day with the previous window behind it, one currency at a
 * time so the axis cannot imply a sum. */
const RevenueChart = ({
  points,
  currency,
  currencies,
  onCurrency,
}: {
  points: Point[]
  currency: string
  currencies: string[]
  onCurrency: (currency: string) => void
}) => (
  <Container className="flex flex-col gap-y-4 p-0">
    <SectionHeader
      title="Revenue"
      hint="Each day of the window, with the window before it for comparison."
      action={
        currencies.length > 1 ? (
          <div className="flex gap-1">
            {currencies.map((option) => (
              <Button
                key={option}
                size="small"
                variant={option === currency ? "primary" : "secondary"}
                onClick={() => onCurrency(option)}
                data-testid={`dashboard-currency-${option}`}
              >
                {option.toUpperCase()}
              </Button>
            ))}
          </div>
        ) : undefined
      }
    />

    <div
      className="h-64 px-2 pb-4"
      role="img"
      aria-label={`Revenue per day in ${currency.toUpperCase()}, this window against the previous one`}
      data-testid="dashboard-revenue-chart"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="dashboard-revenue-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SERIES_COLOR} stopOpacity={0.28} />
              <stop offset="100%" stopColor={SERIES_COLOR} stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke={GRID_COLOR}
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tickFormatter={dayLabel}
            tick={{ fill: AXIS_COLOR, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis
            tickFormatter={(value: number) => compactMoney(value, currency)}
            tick={{ fill: AXIS_COLOR, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={72}
          />
          <Tooltip
            content={<RevenueTooltip currency={currency} />}
            cursor={{ stroke: GRID_COLOR }}
          />
          <Area
            type="monotone"
            dataKey="previous"
            stroke={COMPARISON_COLOR}
            strokeWidth={1.5}
            strokeDasharray="4 4"
            fill="none"
            animationDuration={700}
          />
          <Area
            type="monotone"
            dataKey="current"
            stroke={SERIES_COLOR}
            strokeWidth={2.5}
            fill="url(#dashboard-revenue-fill)"
            animationDuration={700}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </Container>
)

/** Orders per day, no axes. */
const OrdersSparkline = ({ values }: { values: number[] }) => {
  const points = useMemo(
    () => values.map((value, index) => ({ index, value })),
    [values]
  )

  return (
    <div className="h-10 w-full" aria-hidden data-testid="dashboard-orders-sparkline">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="dashboard-orders-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SERIES_COLOR} stopOpacity={0.3} />
              <stop offset="100%" stopColor={SERIES_COLOR} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={SERIES_COLOR}
            strokeWidth={2}
            fill="url(#dashboard-orders-fill)"
            animationDuration={700}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

/** New against returning customers; a customer who ordered twice counts
 * once. */
const CustomersDonut = ({
  fresh,
  returning,
}: {
  fresh: number
  returning: number
}) => {
  const total = fresh + returning
  const slices = [
    { name: "New customers", value: fresh, fill: SERIES_COLOR },
    { name: "Returning customers", value: returning, fill: SECOND_SLICE_COLOR },
  ]

  return (
    <Container className="flex flex-col gap-y-4 p-0">
      <SectionHeader
        title="Customers"
        hint="Who bought in this window."
      />

      {total === 0 ? (
        <div className="px-6 pb-6">
          <Text size="small" className="text-ui-fg-subtle">
            Nobody bought in this window yet.
          </Text>
        </div>
      ) : (
        <>
          <div
            className="relative h-44"
            role="img"
            aria-label={`${fresh} new and ${returning} returning customers in this window`}
            data-testid="dashboard-customers-donut"
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="72%"
                  outerRadius="100%"
                  paddingAngle={2}
                  startAngle={90}
                  endAngle={-270}
                  stroke="none"
                  animationDuration={700}
                >
                  {slices.map((slice) => (
                    <Cell key={slice.name} fill={slice.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--bg-base)",
                    border: `1px solid ${GRID_COLOR}`,
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <Text size="xlarge" weight="plus" leading="compact">
                {total}
              </Text>
              <Text size="xsmall" leading="compact" className="text-ui-fg-subtle">
                customers
              </Text>
            </div>
          </div>

          <ul className="flex flex-col gap-y-2 px-6 pb-6">
            {slices.map((slice) => (
              <li key={slice.name} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: slice.fill }}
                  />
                  <Text size="small" leading="compact">
                    {slice.name}
                  </Text>
                </span>
                <Text size="small" leading="compact" className="text-ui-fg-subtle">
                  {slice.value} · {Math.round((slice.value / total) * 100)}%
                </Text>
              </li>
            ))}
          </ul>
        </>
      )}
    </Container>
  )
}

/** Average rating with the star distribution. */
const Satisfaction = ({
  average,
  count,
  breakdown,
}: {
  average: number | null
  count: number
  breakdown: { rating: number; count: number }[]
}) => {
  const highest = Math.max(1, ...breakdown.map((row) => row.count))

  return (
    <Container className="flex flex-col gap-y-4 p-0" >
      <SectionHeader
        title="Satisfaction"
        hint="Approved product reviews."
      />

      {count === 0 ? (
        <div className="px-6 pb-6">
          <Text size="small" className="text-ui-fg-subtle">
            No review has been approved yet.
          </Text>
        </div>
      ) : (
        <div className="flex flex-col gap-y-4 px-6 pb-6" data-testid="dashboard-satisfaction">
          <div className="flex items-baseline gap-2">
            <Text size="xlarge" weight="plus" leading="compact">
              {average}
            </Text>
            <Text size="small" leading="compact" className="text-ui-fg-subtle">
              out of 5 · {count} review{count === 1 ? "" : "s"}
            </Text>
          </div>

          <ul className="flex flex-col gap-y-2">
            {breakdown
              .slice()
              .sort((a, b) => b.rating - a.rating)
              .map((row) => (
                <li key={row.rating} className="flex items-center gap-3">
                  <Text
                    size="xsmall"
                    leading="compact"
                    className="text-ui-fg-subtle w-8 shrink-0"
                  >
                    {row.rating} ★
                  </Text>
                  <div className="bg-ui-bg-subtle h-2 flex-1 overflow-hidden rounded-full">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${Math.round((row.count / highest) * 100)}%`,
                        backgroundColor: SERIES_COLOR,
                      }}
                    />
                  </div>
                  <Text
                    size="xsmall"
                    leading="compact"
                    className="text-ui-fg-subtle w-8 shrink-0 text-right"
                  >
                    {row.count}
                  </Text>
                </li>
              ))}
          </ul>
        </div>
      )}
    </Container>
  )
}

/* The admin home. Every figure is read from the same endpoints the pages it
 * links to use. The window only moves sales, charts, new customers and orders
 * to ship; pending reviews and low stock are always all-time. */
const DashboardPage = () => {
  const [days, setDays] = useState(30)
  const [currency, setCurrency] = useState<string | null>(null)
  const range = useMemo(() => rangeFor(days), [days])
  const navigate = useNavigate()

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ["admin-dashboard", days],
    queryFn: () =>
      sdk.client.fetch<Dashboard>("/admin/dashboard", {
        query: { from: range.from, to: range.to },
      }),
    // Keep the old figures while the next window loads.
    placeholderData: (previous) => previous,
  })

  const currencies = data ? Object.keys(data.series.revenue) : []
  // The first currency is the one with the most revenue, and a choice made
  // before the data arrived (or for a currency that dropped out of the window)
  // falls back to it.
  const activeCurrency =
    currency && currencies.includes(currency) ? currency : currencies[0] ?? "eur"

  const points = useMemo<Point[]>(() => {
    if (!data) {
      return []
    }

    return data.series.dates.map((date, index) => ({
      date,
      current: data.series.revenue[activeCurrency]?.[index] ?? 0,
      previous: data.series.previous_revenue[activeCurrency]?.[index] ?? 0,
    }))
  }, [data, activeCurrency])

  const rangeLabel = data
    ? `${dayLabel(data.range.from.slice(0, 10))} – ${dayLabel(
        data.range.to.slice(0, 10)
      )}`
    : null

  return (
    <div className="flex flex-col gap-y-4" data-testid="admin-dashboard">
      <Container className="flex flex-wrap items-start justify-between gap-4 px-6 py-4">
        <div>
          <Heading level="h1">Dashboard</Heading>
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            How the shop is doing, and what is waiting on you.
            {rangeLabel ? ` Figures cover ${rangeLabel}.` : ""}
          </Text>
        </div>

        <div className="flex gap-2">
          {RANGES.map((option) => (
            <Button
              key={option.days}
              size="small"
              variant={option.days === days ? "primary" : "secondary"}
              onClick={() => setDays(option.days)}
              data-testid={`dashboard-range-${option.days}`}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </Container>

      {isLoading && (
        <Container className="px-6 py-4">
          <Text size="small" className="text-ui-fg-subtle">
            Loading the figures…
          </Text>
        </Container>
      )}

      {isError && (
        <Container className="px-6 py-4">
          <Text size="small" className="text-ui-fg-error">
            {error instanceof Error
              ? error.message
              : "Could not load the dashboard."}
          </Text>
        </Container>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <RevenueChart
                points={points}
                currency={activeCurrency}
                currencies={currencies}
                onCurrency={setCurrency}
              />
            </div>

            <CustomersDonut
              fresh={data.customers.new_in_range}
              returning={data.customers.returning_in_range}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Kpi
              title="Revenue"
              hint={isFetching ? "Updating…" : "Sold in this window"}
              delta={
                data.deltas.revenue[activeCurrency] === undefined
                  ? null
                  : data.deltas.revenue[activeCurrency]
              }
            >
              {data.sales.revenue.length === 0 ? (
                <Text size="xlarge" weight="plus" data-testid="dashboard-revenue">
                  —
                </Text>
              ) : (
                data.sales.revenue.map((entry) => (
                  <Text
                    key={entry.currency_code}
                    size="xlarge"
                    weight="plus"
                    data-testid={`dashboard-revenue-${entry.currency_code}`}
                  >
                    {formatMoney(entry.amount, entry.currency_code)}
                  </Text>
                ))
              )}
            </Kpi>

            <Kpi title="Orders" delta={data.deltas.orders}>
              <Text size="xlarge" weight="plus" data-testid="dashboard-orders">
                {data.sales.order_count}
              </Text>
              <OrdersSparkline values={data.series.orders} />
            </Kpi>

            <Kpi
              title="New customers"
              hint={`${data.customers.total} in total`}
              delta={data.deltas.new_customers}
            >
              <Text
                size="xlarge"
                weight="plus"
                data-testid="dashboard-new-customers"
              >
                {data.customers.new_in_range}
              </Text>
            </Kpi>

            <Kpi title="Waiting to ship" hint="Orders in this window">
              <Text
                size="xlarge"
                weight="plus"
                data-testid="dashboard-unshipped"
              >
                {data.fulfillment.unshipped_orders}
              </Text>
              <Text size="xsmall" leading="compact" className="text-ui-fg-muted">
                Not handed to a carrier yet
              </Text>
            </Kpi>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <Container className="flex flex-col divide-y p-0" data-testid="dashboard-top-products">
                <SectionHeader
                  title="Top selling products"
                  hint="By units sold in this window."
                  action={<TextLink to="/products">All products</TextLink>}
                />

                {data.sales.top_products.length === 0 ? (
                  <div className="px-6 py-4">
                    <Text size="small" className="text-ui-fg-subtle">
                      No sales in this window yet.
                    </Text>
                  </div>
                ) : (
                  <Table>
                    <Table.Header>
                      <Table.Row>
                        <Table.HeaderCell className="w-10">#</Table.HeaderCell>
                        <Table.HeaderCell>Product</Table.HeaderCell>
                        <Table.HeaderCell className="text-right">
                          Units
                        </Table.HeaderCell>
                        <Table.HeaderCell className="text-right">
                          Revenue
                        </Table.HeaderCell>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {data.sales.top_products.map((product, index) => (
                        <Table.Row key={product.product_id ?? product.title}>
                          <Table.Cell className="text-ui-fg-muted">
                            {index + 1}
                          </Table.Cell>
                          <Table.Cell>
                            {product.product_id ? (
                              <Link
                                to={`/products/${product.product_id}`}
                                className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover font-medium"
                              >
                                {product.title}
                              </Link>
                            ) : (
                              product.title
                            )}
                          </Table.Cell>
                          <Table.Cell className="text-right">
                            {product.quantity}
                          </Table.Cell>
                          <Table.Cell className="text-right">
                            {Object.entries(product.revenue_by_currency)
                              .map(([currency, amount]) =>
                                formatMoney(amount, currency)
                              )
                              .join(" · ")}
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table>
                )}

                {data.sales.truncated && (
                  <div className="px-6 py-4">
                    <Text size="xsmall" className="text-ui-fg-subtle">
                      This window holds more orders than one summary reads; pick a
                      shorter range for exact figures.
                    </Text>
                  </div>
                )}
              </Container>
            </div>

            <Satisfaction
              average={data.reviews.average_rating}
              count={data.reviews.approved_count}
              breakdown={data.reviews.rating_breakdown}
            />
          </div>

          <Container className="divide-y p-0" data-testid="dashboard-attention">
            <SectionHeader
              title="Needs attention"
              hint="The work that is waiting, oldest problem first."
            />

            <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-4">
              <div>
                <Text size="small" weight="plus" leading="compact">
                  Orders waiting to be shipped
                </Text>
                <Text
                  size="small"
                  leading="compact"
                  className="text-ui-fg-subtle"
                >
                  {data.fulfillment.unshipped_orders === 0
                    ? "Every order in this window has left the warehouse."
                    : `${data.fulfillment.unshipped_orders} order${
                        data.fulfillment.unshipped_orders === 1 ? "" : "s"
                      } in this window still owe the customer a shipment.`}
                </Text>
              </div>
              <TextLink to="/orders">View orders</TextLink>
            </div>

            <div className="px-6 py-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <Text size="small" weight="plus" leading="compact">
                    Reviews waiting for approval
                  </Text>
                  <Text
                    size="small"
                    leading="compact"
                    className="text-ui-fg-subtle"
                  >
                    {data.reviews.pending_count === 0
                      ? "Nothing is waiting for a decision."
                      : "A review is invisible on the storefront until it is approved."}
                  </Text>
                </div>
                <Badge
                  size="2xsmall"
                  color={data.reviews.pending_count ? "orange" : "grey"}
                >
                  {data.reviews.pending_count}
                </Badge>
              </div>

              {data.reviews.pending.length > 0 && (
                <ul className="mt-3 flex flex-col gap-2">
                  {data.reviews.pending.map((review) => (
                    <li
                      key={review.id}
                      className="flex flex-wrap items-baseline justify-between gap-2"
                    >
                      <div className="flex flex-col">
                        <Text size="small" leading="compact">
                          <Stars rating={review.rating} />{" "}
                          {review.title || "(no title)"}
                        </Text>
                        <Text
                          size="xsmall"
                          leading="compact"
                          className="text-ui-fg-subtle"
                        >
                          {review.product_title || review.product_id} ·{" "}
                          {new Date(review.created_at).toLocaleDateString()}
                        </Text>
                      </div>
                      <TextLink to={`/products/${review.product_id}`}>
                        Moderate
                      </TextLink>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="px-6 py-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <Text size="small" weight="plus" leading="compact">
                    Low stock
                  </Text>
                  <Text
                    size="small"
                    leading="compact"
                    className="text-ui-fg-subtle"
                  >
                    {data.stock.low_count === 0
                      ? `Every level is above ${data.stock.threshold} units.`
                      : `${data.stock.low_count} level${
                          data.stock.low_count === 1 ? " is" : "s are"
                        } at or below ${data.stock.threshold} units.`}
                  </Text>
                </div>
                <TextLink to="/inventory">Open inventory</TextLink>
              </div>

              {data.stock.items.length > 0 && (
                <ul className="mt-3 flex flex-col gap-2">
                  {data.stock.items.map((item) => (
                    <li
                      key={`${item.inventory_item_id}:${item.location_id}`}
                      className="flex flex-wrap items-baseline justify-between gap-2"
                    >
                      <Text size="small" leading="compact">
                        {item.title || item.sku || item.inventory_item_id}
                        {item.sku && item.title ? (
                          <span className="text-ui-fg-muted"> · {item.sku}</span>
                        ) : null}
                      </Text>
                      <span className="flex items-baseline gap-3">
                        <Text
                          size="small"
                          leading="compact"
                          className={
                            item.available === 0
                              ? "text-ui-fg-error"
                              : "text-ui-fg-subtle"
                          }
                        >
                          {item.available} left
                        </Text>
                        <TextLink to={`/inventory/${item.inventory_item_id}`}>
                          Restock
                        </TextLink>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Container>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <Container
                className="flex flex-col divide-y p-0"
                data-testid="dashboard-recent-orders"
              >
                <SectionHeader
                  title="Recent orders"
                  action={<TextLink to="/orders">All orders</TextLink>}
                />

                {data.recent_orders.length === 0 ? (
                  <div className="px-6 py-4">
                    <Text size="small" className="text-ui-fg-subtle">
                      No orders yet.
                    </Text>
                  </div>
                ) : (
                  data.recent_orders.map((order) => (
                    <div
                      key={order.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-6 py-3"
                    >
                      <div className="flex flex-col">
                        <Link
                          to={`/orders/${order.id}`}
                          className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover text-sm font-medium"
                        >
                          {order.display_id ? `#${order.display_id}` : order.id}
                        </Link>
                        <Text
                          size="xsmall"
                          leading="compact"
                          className="text-ui-fg-subtle"
                        >
                          {order.email || "guest"} ·{" "}
                          {new Date(order.created_at).toLocaleDateString()}
                        </Text>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          size="2xsmall"
                          color={
                            PAYMENT_COLORS[order.payment_status ?? ""] ?? "grey"
                          }
                        >
                          {label(order.payment_status)}
                        </Badge>
                        <Badge
                          size="2xsmall"
                          color={
                            FULFILLMENT_COLORS[order.fulfillment_status ?? ""] ??
                            "grey"
                          }
                        >
                          {label(order.fulfillment_status)}
                        </Badge>
                        <Text size="small" leading="compact">
                          {formatMoney(order.total, order.currency_code)}
                        </Text>
                      </div>
                    </div>
                  ))
                )}
              </Container>
            </div>

            <Container className="flex flex-col divide-y p-0">
              <SectionHeader title="Quick actions" />

              <div className="flex flex-col gap-2 px-6 py-4">
                <Button
                  size="small"
                  onClick={() => navigate("/products/create")}
                >
                  Create a product
                </Button>
                <Button
                  size="small"
                  variant="secondary"
                  onClick={() => navigate("/orders")}
                >
                  Review orders
                </Button>
                <Button
                  size="small"
                  variant="secondary"
                  onClick={() => navigate("/inventory")}
                >
                  Manage inventory
                </Button>
                <Button
                  size="small"
                  variant="secondary"
                  onClick={() => navigate("/promotions")}
                >
                  Create a promotion
                </Button>
                <Button
                  size="small"
                  variant="transparent"
                  onClick={() => navigate("/settings/store")}
                >
                  Store settings
                </Button>
              </div>
            </Container>
          </div>
        </>
      )}
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Dashboard",
  icon: ChartBar,
})

export default DashboardPage
