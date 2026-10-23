/**
 * The low-stock rules, as functions with no database in them.
 *
 * They are separate from the job so the two things that can go wrong — the
 * wrong rows being called low, and the same row being mailed twice — can be
 * tested without an inventory module, an inbox or a clock.
 */

/** Warn at or below this many buyable units. Overridable per deployment. */
export const DEFAULT_LOW_STOCK_THRESHOLD = 5

/** How long one level's alert counts as "already sent". */
export const DEFAULT_ALERT_COOLDOWN_HOURS = 24

const HOUR_MS = 60 * 60 * 1000

export type InventoryLevel = {
  location_id?: string | null
  stocked_quantity?: number | null
  reserved_quantity?: number | null
}

export type LowStockLine = {
  inventory_item_id: string
  location_id: string
  /** Units a customer could still buy: stocked minus reserved. */
  available: number
  sku: string | null
  title: string | null
}

/**
 * Units that can still be sold at one location.
 *
 * Reserved units are spoken for by an order that has not left yet, so counting
 * them as available would let a level read healthy while every unit is already
 * promised. A negative result is reported as zero — a level can be oversold,
 * and "-2 available" is not a number to put in an email.
 */
export const availableUnits = (level: InventoryLevel): number => {
  const stocked = Number(level.stocked_quantity ?? 0)
  const reserved = Number(level.reserved_quantity ?? 0)

  if (!Number.isFinite(stocked) || !Number.isFinite(reserved)) {
    return 0
  }

  return Math.max(0, stocked - reserved)
}

/**
 * Reads a threshold from the environment, falling back to the default.
 *
 * A negative threshold is refused rather than honoured: it would mean "alert
 * when stock is below minus one", i.e. never, which is indistinguishable from
 * a broken job.
 */
export const readThreshold = (raw: string | undefined): number => {
  const parsed = Number.parseInt(String(raw ?? "").trim(), 10)

  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_LOW_STOCK_THRESHOLD
  }

  return parsed
}

/** The cooldown in hours, with the same "refuse nonsense" rule as the threshold. */
export const readCooldownHours = (raw: string | undefined): number => {
  const parsed = Number.parseInt(String(raw ?? "").trim(), 10)

  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_ALERT_COOLDOWN_HOURS
  }

  return parsed
}

/**
 * The levels of one item that are at or below the threshold.
 *
 * The threshold is inclusive on purpose: a threshold of 5 with 5 units left is
 * exactly the situation the email is for, and an exclusive rule would stay
 * silent at the number an admin typed in.
 */
export const lowStockLevels = (
  item: {
    id: string
    sku?: string | null
    title?: string | null
    location_levels?: InventoryLevel[] | null
  },
  threshold: number
): LowStockLine[] =>
  (item.location_levels ?? [])
    .filter((level): level is InventoryLevel & { location_id: string } =>
      Boolean(level?.location_id)
    )
    .map((level) => ({
      inventory_item_id: item.id,
      location_id: level.location_id,
      available: availableUnits(level),
      sku: item.sku ?? null,
      title: item.title ?? null,
    }))
    .filter((line) => line.available <= threshold)

/**
 * Whether a level's last alert is old enough to mail again.
 *
 * No previous alert (a level that has never been low, or one whose row was
 * cleaned up) is always due. A clock that moved backwards — a restored backup,
 * a changed timezone — reads as due as well, because the alternative is an
 * alert that can never fire again.
 */
export const isAlertDue = (
  lastAlertedAt: string | Date | null | undefined,
  now: Date,
  cooldownHours: number
): boolean => {
  if (!lastAlertedAt) {
    return true
  }

  const last = lastAlertedAt instanceof Date ? lastAlertedAt : new Date(lastAlertedAt)

  if (Number.isNaN(last.getTime())) {
    return true
  }

  return now.getTime() - last.getTime() >= cooldownHours * HOUR_MS
}

/**
 * A name an admin recognises, from whatever the store has on the item.
 *
 * The variant's product title is what the storefront shows, so it is what the
 * admin will search for; the inventory item's own title is the last resort, and
 * an untitled row is better left unnamed than shown as "undefined".
 */
export const inventoryItemTitle = (item: {
  title?: string | null
  variants?:
    | {
        title?: string | null
        product?: { title?: string | null } | null
      }[]
    | null
}): string | null => {
  const variant = item.variants?.[0]
  const productTitle = variant?.product?.title?.trim()
  const variantTitle = variant?.title?.trim()

  if (productTitle && variantTitle) {
    return `${productTitle} (${variantTitle})`
  }

  return productTitle || variantTitle || item.title?.trim() || null
}

/**
 * Groups the due lines by inventory item, for the one email that lists them.
 */
export const groupByItem = (lines: LowStockLine[]): LowStockLine[][] => {
  const byItem = new Map<string, LowStockLine[]>()

  for (const line of lines) {
    const existing = byItem.get(line.inventory_item_id)

    if (existing) {
      existing.push(line)
    } else {
      byItem.set(line.inventory_item_id, [line])
    }
  }

  return Array.from(byItem.values())
}
