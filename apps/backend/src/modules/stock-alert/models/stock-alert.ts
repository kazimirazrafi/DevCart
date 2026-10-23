import { model } from "@medusajs/framework/utils"

/**
 * The last time an inventory level was reported as low.
 *
 * The row exists so the scheduled job can answer "was this already mentioned?"
 * without a log file: `alerted_at` is the whole state, and an alert older than
 * the cooldown is simply due again. `quantity` is the availability that was
 * reported, kept so an admin can see how far the level had fallen when the
 * mail went out.
 *
 * One row per (inventory item, location): the pair is what a stock level is, so
 * the unique index is the identity rather than a safeguard.
 */
export const StockAlert = model.define("stock_alert", {
  id: model.id().primaryKey(),
  inventory_item_id: model.text(),
  location_id: model.text(),
  quantity: model.number(),
  alerted_at: model.dateTime(),
}).indexes([
  {
    on: ["inventory_item_id", "location_id"],
    unique: true,
  },
])
