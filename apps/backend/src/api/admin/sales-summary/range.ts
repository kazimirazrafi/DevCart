import { MedusaError } from "@medusajs/framework/utils"

/**
 * The window the sales summary reports on.
 *
 * Parsing is separate from the route so the rules — what counts as a date, how
 * long a range may be, what "nothing given" means — can be unit-tested without
 * an admin session.
 */

export const DEFAULT_RANGE_DAYS = 30

/**
 * The longest window the summary will read.
 *
 * The route walks the orders in pages and sums them in memory, so an unbounded
 * range is an unbounded read. A year is more than the dashboard offers and more
 * than a shop needs to answer "how are we doing"; anything longer is answered
 * with a message rather than a slow request.
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
 * `from` and `to` are inclusive ISO timestamps; with neither given, the last
 * `DEFAULT_RANGE_DAYS` days ending now. One end may be given on its own: `from`
 * alone ends today, `to` alone reaches back the default number of days.
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
