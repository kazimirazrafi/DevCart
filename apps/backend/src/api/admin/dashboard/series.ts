import type { OrderForSummary } from "../sales-summary/aggregate"

/**
 * Chart helpers: day buckets, currency series and percentage change. Pure, so
 * they can be tested without an API or a clock.
 */

const DAY_MS = 24 * 60 * 60 * 1000

export type DailyBucket = {
  /** UTC day, `YYYY-MM-DD`. */
  date: string
  orders: number
  /** Never add two currencies together. */
  revenue: Record<string, number>
}

const round = (value: number) => Math.round(value * 100) / 100

const money = (value: unknown): number => {
  const amount = Number(value ?? 0)

  return Number.isFinite(amount) ? amount : 0
}

const startOfUtcDay = (date: Date) =>
  Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())

const dayKey = (date: Date) => date.toISOString().slice(0, 10)

/**
 * One bucket per UTC day in the window, both ends included. Days come from the
 * range, so a day without a sale is a zero rather than a gap in the line.
 */
export const dailyBuckets = (from: Date, to: Date): DailyBucket[] => {
  const start = startOfUtcDay(from)
  const days = Math.max(1, Math.floor((startOfUtcDay(to) - start) / DAY_MS) + 1)

  return Array.from({ length: days }, (_, index) => ({
    date: dayKey(new Date(start + index * DAY_MS)),
    orders: 0,
    revenue: {},
  }))
}

/**
 * Counts and sums the window's orders into the day they were placed. Orders
 * outside the buckets are dropped, not folded into the nearest day.
 */
export const bucketOrdersByDay = (
  orders: OrderForSummary[],
  from: Date,
  to: Date
): DailyBucket[] => {
  const buckets = dailyBuckets(from, to)
  const start = startOfUtcDay(from)

  for (const order of orders) {
    const createdAt = order.created_at ? new Date(order.created_at).getTime() : NaN

    if (!Number.isFinite(createdAt)) {
      continue
    }

    const index = Math.floor((createdAt - start) / DAY_MS)

    if (index < 0 || index >= buckets.length) {
      continue
    }

    const bucket = buckets[index]
    const currency = (order.currency_code || "eur").toLowerCase()

    bucket.orders += 1
    bucket.revenue[currency] = round(
      (bucket.revenue[currency] ?? 0) + money(order.total)
    )
  }

  return buckets
}

/** One series per currency, one value per day. */
export const revenueSeries = (
  buckets: DailyBucket[],
  currencies: string[]
): Record<string, number[]> => {
  const series: Record<string, number[]> = {}

  for (const currency of currencies) {
    series[currency] = buckets.map((bucket) => bucket.revenue[currency] ?? 0)
  }

  return series
}

/** Cut or zero-pad a series, so both windows share one day index. */
export const alignTo = (values: number[], length: number): number[] =>
  Array.from({ length }, (_, index) => values[index] ?? 0)

/**
 * Percentage change from the previous window. `null` when there is no baseline:
 * zero before is not "+100%".
 */
export const percentChange = (
  current: number,
  previous: number
): number | null => {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) {
    return null
  }

  if (previous === 0) {
    return null
  }

  // One decimal is what a percentage is read to.
  return Math.round(((current - previous) / previous) * 1000) / 10
}
