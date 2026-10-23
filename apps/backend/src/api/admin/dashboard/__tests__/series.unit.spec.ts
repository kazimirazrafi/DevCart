import type { OrderForSummary } from "../../sales-summary/aggregate"
import {
  alignTo,
  bucketOrdersByDay,
  dailyBuckets,
  percentChange,
  revenueSeries,
} from "../series"

const from = new Date("2026-10-01T00:00:00.000Z")
const to = new Date("2026-10-03T23:59:59.000Z")

const order = (
  id: string,
  createdAt: string,
  total: number,
  currency: string
): OrderForSummary => ({
  id,
  created_at: createdAt,
  total,
  currency_code: currency,
})

describe("dailyBuckets", () => {
  it("gives one bucket per UTC day, both ends included", () => {
    expect(dailyBuckets(from, to).map((bucket) => bucket.date)).toEqual([
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
    ])
  })

  it("gives a single bucket for a range inside one day", () => {
    expect(
      dailyBuckets(
        new Date("2026-10-01T08:00:00.000Z"),
        new Date("2026-10-01T20:00:00.000Z")
      )
    ).toHaveLength(1)
  })

  it("starts every bucket empty", () => {
    expect(dailyBuckets(from, to)[0]).toEqual({
      date: "2026-10-01",
      orders: 0,
      revenue: {},
    })
  })
})

describe("bucketOrdersByDay", () => {
  it("counts and sums an order into the day it was placed", () => {
    const buckets = bucketOrdersByDay(
      [
        order("a", "2026-10-01T10:00:00.000Z", 20, "eur"),
        order("b", "2026-10-01T18:00:00.000Z", 30.5, "eur"),
        order("c", "2026-10-03T09:00:00.000Z", 10, "usd"),
      ],
      from,
      to
    )

    expect(buckets[0]).toEqual({
      date: "2026-10-01",
      orders: 2,
      revenue: { eur: 50.5 },
    })
    expect(buckets[1]).toEqual({ date: "2026-10-02", orders: 0, revenue: {} })
    expect(buckets[2]).toEqual({
      date: "2026-10-03",
      orders: 1,
      revenue: { usd: 10 },
    })
  })

  it("keeps two currencies apart instead of adding them", () => {
    const buckets = bucketOrdersByDay(
      [
        order("a", "2026-10-02T10:00:00.000Z", 20, "eur"),
        order("b", "2026-10-02T11:00:00.000Z", 30, "usd"),
      ],
      from,
      to
    )

    expect(buckets[1].revenue).toEqual({ eur: 20, usd: 30 })
  })

  it("leaves an order outside the window out rather than moving it", () => {
    const buckets = bucketOrdersByDay(
      [
        order("before", "2026-09-30T23:00:00.000Z", 10, "eur"),
        order("after", "2026-10-04T01:00:00.000Z", 10, "eur"),
      ],
      from,
      to
    )

    expect(buckets.reduce((sum, bucket) => sum + bucket.orders, 0)).toBe(0)
  })

  it("skips an order whose date cannot be read", () => {
    const buckets = bucketOrdersByDay(
      [
        { id: "a", created_at: null, total: 10, currency_code: "eur" },
        { id: "b", created_at: "not a date", total: 10, currency_code: "eur" },
      ],
      from,
      to
    )

    expect(buckets.reduce((sum, bucket) => sum + bucket.orders, 0)).toBe(0)
  })

  it("rounds money to the precision money has", () => {
    const buckets = bucketOrdersByDay(
      [
        order("a", "2026-10-01T10:00:00.000Z", 0.1, "eur"),
        order("b", "2026-10-01T11:00:00.000Z", 0.2, "eur"),
      ],
      from,
      to
    )

    expect(buckets[0].revenue.eur).toBe(0.3)
  })

  it("falls back to eur when an order carries no currency", () => {
    const buckets = bucketOrdersByDay(
      [{ id: "a", created_at: "2026-10-01T10:00:00.000Z", total: 5 }],
      from,
      to
    )

    expect(buckets[0].revenue).toEqual({ eur: 5 })
  })
})

describe("revenueSeries", () => {
  it("gives every currency asked for a value on every day", () => {
    const buckets = bucketOrdersByDay(
      [order("a", "2026-10-02T10:00:00.000Z", 20, "eur")],
      from,
      to
    )

    expect(revenueSeries(buckets, ["eur", "usd"])).toEqual({
      eur: [0, 20, 0],
      usd: [0, 0, 0],
    })
  })

  it("says nothing when no currency is asked for", () => {
    expect(revenueSeries(dailyBuckets(from, to), [])).toEqual({})
  })
})

describe("alignTo", () => {
  it("pads a shorter series with zeros", () => {
    expect(alignTo([1, 2], 4)).toEqual([1, 2, 0, 0])
  })

  it("cuts a longer series to the window being drawn", () => {
    expect(alignTo([1, 2, 3], 2)).toEqual([1, 2])
  })
})

describe("percentChange", () => {
  it("reports a rise and a fall, rounded to one decimal", () => {
    expect(percentChange(120, 100)).toBe(20)
    expect(percentChange(80, 100)).toBe(-20)
    expect(percentChange(1, 3)).toBe(-66.7)
  })

  it("refuses a percentage against a window that had nothing", () => {
    expect(percentChange(50, 0)).toBeNull()
  })

  it("refuses a percentage from values that are not numbers", () => {
    expect(percentChange(Number.NaN, 10)).toBeNull()
  })

  it("reports no change as zero", () => {
    expect(percentChange(10, 10)).toBe(0)
  })
})
