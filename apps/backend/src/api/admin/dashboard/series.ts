import type { OrderForSummary } from "../sales-summary/aggregate"

/**
 * The dashboard's charts need the window as a sequence, not as a total.
 *
 * Pure functions on purpose: bucketing a month into days and comparing two
 * windows are the parts that can be wrong in a way that still looks plausible —
 * an order counted in the wrong day, a percentage against an empty baseline —
 * so they are testable without an API, a database or a clock.
 */

const DAY_MS = 24 * 60 * 60 * 1000

export type DailyBucket = {
  /** The UTC day, as `YYYY-MM-DD`. */
  date: string
  orders: number
  /** Money per currency: two currencies are never added together. */
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
 * One bucket per UTC day the window touches, both ends included.
 *
 * The days come from the range rather than from the orders, so a day without a
 * sale is a zero in the chart instead of a missing point that the line would
 * draw straight through.
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
 * The window's orders, counted and summed into the day they were placed.
 *
 * An order outside the buckets is left out rather than folded into the nearest
 * day: the read is filtered to the same range, so that only happens when a
 * caller passes a mismatched pair, and quietly moving the day would hide it.
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

/**
 * A per-currency series, one entry per day.
 *
 * The currencies are the union of both windows', because a chart that draws
 * this period's dollars against last period's euros has to have a row for
 * every day in both — the currency picker shows each one, whatever the earlier
 * window held.
 */
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

/**
 * A series cut or padded to `length`.
 *
 * The comparison line is drawn beside this window's, one point per day, and
 * the two windows can differ by a day at the edges (a range given in hours
 * rather than dates). Padding with zero keeps every point on the same day
 * index instead of sliding the earlier window along the axis.
 */
export const alignTo = (values: number[], length: number): number[] =>
  Array.from({ length }, (_, index) => values[index] ?? 0)

/**
 * The percentage change from a previous window, or `null` when there is
 * nothing to compare against.
 *
 * A previous window of zero is not "+100%" or "+∞%": the shop had no baseline,
 * and a made-up percentage is worse than admitting it. The page renders `null`
 * as "no comparison yet".
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

  // One decimal: a percentage is read as "up 12.5%", not to the cent.
  return Math.round(((current - previous) / previous) * 1000) / 10
}
