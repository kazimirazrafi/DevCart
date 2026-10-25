/** Low-stock rules as pure functions, so they can be tested without a
 * database, an inbox or a clock. */

/** Warn at or below this many buyable units. */
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
  /** Units a customer can still buy. */
  available: number
  sku: string | null
  title: string | null
}

/** Units a customer can still buy: stocked minus reserved, never negative. */
export const availableUnits = (level: InventoryLevel): number => {
  const stocked = Number(level.stocked_quantity ?? 0)
  const reserved = Number(level.reserved_quantity ?? 0)

  if (!Number.isFinite(stocked) || !Number.isFinite(reserved)) {
    return 0
  }

  return Math.max(0, stocked - reserved)
}

/** Threshold from the environment. A negative value is refused: it would
 * mean alerts never fire. */
export const readThreshold = (raw: string | undefined): number => {
  const parsed = Number.parseInt(String(raw ?? "").trim(), 10)

  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_LOW_STOCK_THRESHOLD
  }

  return parsed
}

/** Cooldown in hours; invalid values fall back to the default. */
export const readCooldownHours = (raw: string | undefined): number => {
  const parsed = Number.parseInt(String(raw ?? "").trim(), 10)

  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_ALERT_COOLDOWN_HOURS
  }

  return parsed
}

/** The levels at or below the threshold. Inclusive: 5 left at a threshold of
 * 5 is exactly the case the email is for. */
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

/** Whether the last alert is old enough to send again. No row, or a clock
 * that moved backwards, counts as due. */
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

/** Product title first, then the inventory item's own title, then nothing. */
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

/** Groups the due lines by inventory item for the single email. */
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
