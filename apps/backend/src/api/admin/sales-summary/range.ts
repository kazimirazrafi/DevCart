import { MedusaError } from "@medusajs/framework/utils"

/**
 * Parses the sales summary window, apart from the route so the rules can be
 * unit-tested.
 */

export const DEFAULT_RANGE_DAYS = 30

/**
 * The route sums orders in memory, so the window is capped: a year, well past
 * anything the dashboard offers.
 */
export const MAX_RANGE_DAYS = 366

const DAY_MS = 24 * 60 * 60 * 1000

const parse = (value: unknown, label: string): Date => {
  if (typeof value !== "string" || value.trim() === "") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Give a ${label} date, for example 2026-10-01.`
    )
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `"${value}" is not a ${label} date.`
    )
  }

  return date
}

/**
 * `from` and `to` are inclusive; with neither given, the last 30 days. Either
 * end may be given alone.
 */
export const readRange = (
  fromRaw: unknown,
  toRaw: unknown,
  now: Date = new Date()
): { from: Date; to: Date } => {
  const hasFrom = typeof fromRaw === "string" && fromRaw.trim() !== ""
  const hasTo = typeof toRaw === "string" && toRaw.trim() !== ""

  const to = hasTo ? parse(toRaw, "to") : now
  const from = hasFrom
    ? parse(fromRaw, "from")
    : new Date(to.getTime() - DEFAULT_RANGE_DAYS * DAY_MS)

  if (from.getTime() > to.getTime()) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "The from date is after the to date."
    )
  }

  if (to.getTime() - from.getTime() > MAX_RANGE_DAYS * DAY_MS) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Pick a range of ${MAX_RANGE_DAYS} days or fewer.`
    )
  }

  return { from, to }
}
