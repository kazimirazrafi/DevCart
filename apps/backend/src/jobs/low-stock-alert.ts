import type { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

import { EMAIL_TEMPLATES } from "../modules/notification-resend/templates"
import { STOCK_ALERT_MODULE } from "../modules/stock-alert"
import {
  inventoryItemTitle,
  isAlertDue,
  lowStockLevels,
  readCooldownHours,
  readThreshold,
  type LowStockLine,
} from "../modules/stock-alert/low-stock"
import StockAlertModuleService from "../modules/stock-alert/service"

type InventoryItemRow = {
  id: string
  sku?: string | null
  title?: string | null
  location_levels?: {
    location_id?: string | null
    stocked_quantity?: number | null
    reserved_quantity?: number | null
  }[] | null
  variants?: {
    title?: string | null
    product?: { title?: string | null } | null
  }[] | null
}

const adminUrl = () =>
  `${(process.env.BACKEND_URL || "http://localhost:9000").replace(/\/+$/, "")}/app`

/**
 * Emails the admin once per level per cooldown. The `stock_alert` row is the
 * dedupe, not the schedule. A notification failure is logged and the rows are
 * left alone, so the next run retries instead of a shortage going quiet.
 */
export default async function lowStockAlertJob(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const recipient = process.env.LOW_STOCK_ALERT_EMAIL?.trim()

  if (!recipient) {
    // Off by configuration, not broken.
    logger.info(
      "LOW_STOCK_ALERT_EMAIL is not set; skipping the low-stock check."
    )
    return
  }

  const threshold = readThreshold(process.env.LOW_STOCK_THRESHOLD)
  const cooldownHours = readCooldownHours(
    process.env.LOW_STOCK_ALERT_COOLDOWN_HOURS
  )

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "inventory_item",
    fields: [
      "id",
      "sku",
      "title",
      "location_levels.location_id",
      "location_levels.stocked_quantity",
      "location_levels.reserved_quantity",
      "variants.title",
      "variants.product.title",
    ],
  })

  const items = data as unknown as InventoryItemRow[]
  const lines: LowStockLine[] = items.flatMap((item) => {
    const title = inventoryItemTitle(item)

    return lowStockLevels(item, threshold).map((line) => ({
      ...line,
      title: title ?? line.title,
    }))
  })

  if (!lines.length) {
    logger.info(`Low-stock check: nothing at or below ${threshold}.`)
    return
  }

  const alertService: StockAlertModuleService =
    container.resolve(STOCK_ALERT_MODULE)

  // `$in` is required: the module treats a bare array as one value, which
  // would make every run look like a first alert.
  const existing = await alertService.listStockAlerts({
    inventory_item_id: {
      $in: Array.from(new Set(lines.map((line) => line.inventory_item_id))),
    },
  })

  const known = new Map(
    existing.map((alert) => [
      `${alert.inventory_item_id}:${alert.location_id}`,
      alert,
    ])
  )

  const now = new Date()
  const due = lines.filter((line) =>
    isAlertDue(
      known.get(`${line.inventory_item_id}:${line.location_id}`)?.alerted_at,
      now,
      cooldownHours
    )
  )

  if (!due.length) {
    logger.info(
      `Low-stock check: ${lines.length} low level(s), all reported within ${cooldownHours} hours.`
    )
    return
  }

  const stockLocationService = container.resolve(Modules.STOCK_LOCATION)
  const locations = await stockLocationService.listStockLocations({
    id: Array.from(new Set(due.map((line) => line.location_id))),
  })

  const locationNames = new Map(
    locations.map((location) => [location.id, location.name])
  )

  const notificationService = container.resolve(Modules.NOTIFICATION)

  try {
    await notificationService.createNotifications({
      to: recipient,
      channel: "email",
      template: EMAIL_TEMPLATES.LOW_STOCK_ALERT,
      data: {
        storeName: process.env.STORE_NAME || "DevCart",
        threshold,
        items: due.map((line) => ({
          title: line.title,
          sku: line.sku,
          location: locationNames.get(line.location_id) ?? null,
          available: line.available,
        })),
        adminUrl: adminUrl(),
      },
    })
  } catch (error) {
    logger.error(
      `Could not send the low-stock alert; it will be retried next run: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
    return
  }

  for (const line of due) {
    const previous = known.get(`${line.inventory_item_id}:${line.location_id}`)

    if (previous) {
      await alertService.updateStockAlerts({
        id: previous.id,
        quantity: line.available,
        alerted_at: now,
      })
    } else {
      await alertService.createStockAlerts({
        inventory_item_id: line.inventory_item_id,
        location_id: line.location_id,
        quantity: line.available,
        alerted_at: now,
      })
    }
  }

  logger.info(
    `Low-stock alert sent to the admin for ${due.length} level(s) at or below ${threshold}.`
  )
}

/** Hourly by default; the cooldown, not this, limits repeat alerts. */
export const config = {
  name: "low-stock-alert",
  schedule: process.env.LOW_STOCK_ALERT_SCHEDULE || "0 * * * *",
}
