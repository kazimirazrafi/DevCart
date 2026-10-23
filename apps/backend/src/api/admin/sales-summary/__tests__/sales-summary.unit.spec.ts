import { MedusaError } from "@medusajs/framework/utils"

import { countUnshipped, summariseSales, type OrderForSummary } from "../aggregate"
import { DEFAULT_RANGE_DAYS, MAX_RANGE_DAYS, readRange } from "../range"

describe("readRange", () => {
  const now = new Date("2026-10-20T12:00:00.000Z")

  it("defaults to the last 30 days when nothing is given", () => {
    const { from, to } = readRange(undefined, undefined, now)

    expect(to.toISOString()).toBe(now.toISOString())
    expect(to.getTime() - from.getTime()).toBe(
      DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000
    )
  })

  it("reads both ends when they are given", () => {
    const { from, to } = readRange(
      "2026-10-01T00:00:00.000Z",
      "2026-10-10T00:00:00.000Z",
      now
    )

    expect(from.toISOString()).toBe("2026-10-01T00:00:00.000Z")
    expect(to.toISOString()).toBe("2026-10-10T00:00:00.000Z")
  })

  it("ends today when only the start is given", () => {
    const { from, to } = readRange("2026-10-18T00:00:00.000Z", undefined, now)

    expect(to.toISOString()).toBe(now.toISOString())
    expect(from.toISOString()).toBe("2026-10-18T00:00:00.000Z")
  })

  it("reaches back the default window when only the end is given", () => {
    const { from, to } = readRange(undefined, "2026-10-10T00:00:00.000Z", now)

    expect(to.toISOString()).toBe("2026-10-10T00:00:00.000Z")
    expect(to.getTime() - from.getTime()).toBe(
      DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000
    )
  })

  it("refuses a date it cannot read", () => {
    expect(() => readRange("yesterday", undefined, now)).toThrow(MedusaError)
  })

  it("refuses a start after the end", () => {
    expect(() =>
      readRange("2026-10-10T00:00:00.000Z", "2026-10-01T00:00:00.000Z", now)
    ).toThrow(/after the to date/)
  })

  it("refuses a range longer than a year", () => {
    expect(() =>
      readRange("2024-01-01T00:00:00.000Z", "2026-10-20T00:00:00.000Z", now)
    ).toThrow(new RegExp(`${MAX_RANGE_DAYS} days or fewer`))
  })

  it("treats an empty string as absent", () => {
    const { from, to } = readRange("", "  ", now)

    expect(to.toISOString()).toBe(now.toISOString())
    expect(from).toBeInstanceOf(Date)
  })
})

describe("summariseSales", () => {
  const orders: OrderForSummary[] = [
    {
      id: "order_1",
      total: 58.5,
      currency_code: "eur",
      items: [
        { product_title: "Hello World Tee", quantity: 2, total: 56 },
        { product_title: "Sticker", quantity: 1, total: 2.5 },
      ],
    },
    {
      id: "order_2",
      total: 28,
      currency_code: "eur",
      items: [{ product_title: "Hello World Tee", quantity: 1, total: 28 }],
    },
    {
      id: "order_3",
      total: 40,
      currency_code: "usd",
      items: [{ product_title: "Hello World Tee", quantity: 1, total: 40 }],
    },
  ]

  it("counts the orders it was given", () => {
    expect(summariseSales(orders).order_count).toBe(3)
  })

  it("reports revenue per currency rather than mixing them", () => {
    const summary = summariseSales(orders)

    expect(summary.revenue).toEqual([
      { currency_code: "eur", amount: 86.5 },
      { currency_code: "usd", amount: 40 },
    ])
  })

  it("ranks products by units sold", () => {
    const summary = summariseSales(orders)

    expect(summary.top_products[0].title).toBe("Hello World Tee")
    expect(summary.top_products[0].quantity).toBe(4)
    expect(summary.top_products[1].title).toBe("Sticker")
    expect(summary.top_products[1].quantity).toBe(1)
  })

  it("keeps each product's revenue in the currency it was sold in", () => {
    const tee = summariseSales(orders).top_products[0]

    expect(tee.revenue_by_currency).toEqual({ eur: 84, usd: 40 })
  })

  it("caps the list at the requested number", () => {
    expect(summariseSales(orders, { limit: 1 }).top_products).toHaveLength(1)
  })

  it("breaks a tie on units by revenue, then by title", () => {
    const tied: OrderForSummary[] = [
      {
        id: "a",
        total: 10,
        currency_code: "eur",
        items: [
          { product_title: "Zeta", quantity: 1, total: 1 },
          { product_title: "Alpha", quantity: 1, total: 1 },
          { product_title: "Beta", quantity: 1, total: 5 },
        ],
      },
    ]

    const top = summariseSales(tied).top_products

    expect(top.map((product) => product.title)).toEqual([
      "Beta",
      "Alpha",
      "Zeta",
    ])
  })

  it("says nothing about a window with no orders", () => {
    expect(summariseSales([])).toEqual({
      order_count: 0,
      revenue: [],
      top_products: [],
    })
  })

  it("ignores an item with no product title", () => {
    const summary = summariseSales([
      {
        id: "a",
        total: 5,
        currency_code: "eur",
        items: [{ product_title: null, quantity: 3, total: 5 }],
      },
    ])

    expect(summary.top_products).toHaveLength(0)
    expect(summary.revenue).toEqual([{ currency_code: "eur", amount: 5 }])
  })

  it("rounds amounts to the precision money has", () => {
    const summary = summariseSales([
      { id: "a", total: 0.1, currency_code: "eur", items: [] },
      { id: "b", total: 0.2, currency_code: "eur", items: [] },
    ])

    expect(summary.revenue[0].amount).toBe(0.3)
  })

  it("falls back to eur when an order carries no currency", () => {
    const summary = summariseSales([{ id: "a", total: 3 }])

    expect(summary.revenue).toEqual([{ currency_code: "eur", amount: 3 }])
  })
})

describe("countUnshipped", () => {
  it("counts an order with no fulfillment as still waiting", () => {
    expect(countUnshipped([{ id: "a", fulfillments: [] }])).toBe(1)
  })

  it("counts an order whose shipment has not left yet", () => {
    expect(
      countUnshipped([
        { id: "a", fulfillments: [{ shipped_at: null }] },
      ])
    ).toBe(1)
  })

  it("leaves out an order whose shipments have all left", () => {
    expect(
      countUnshipped([
        {
          id: "a",
          fulfillments: [
            { shipped_at: "2026-10-01T10:00:00.000Z" },
            { shipped_at: "2026-10-02T10:00:00.000Z" },
          ],
        },
      ])
    ).toBe(0)
  })

  it("counts an order with one parcel still waiting as unshipped", () => {
    expect(
      countUnshipped([
        {
          id: "a",
          fulfillments: [
            { shipped_at: "2026-10-01T10:00:00.000Z" },
            { shipped_at: null },
          ],
        },
      ])
    ).toBe(1)
  })

  it("ignores a cancelled fulfillment rather than holding it against the order", () => {
    expect(
      countUnshipped([
        {
          id: "a",
          fulfillments: [
            { shipped_at: "2026-10-01T10:00:00.000Z" },
            { shipped_at: null, canceled_at: "2026-10-03T10:00:00.000Z" },
          ],
        },
      ])
    ).toBe(0)
  })

  it("counts every order in a mixed window", () => {
    expect(
      countUnshipped([
        { id: "a", fulfillments: [{ shipped_at: "2026-10-01T10:00:00.000Z" }] },
        { id: "b", fulfillments: [] },
        { id: "c", fulfillments: [{ shipped_at: null }] },
      ])
    ).toBe(2)
  })
})
