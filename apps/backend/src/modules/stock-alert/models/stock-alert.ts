import { model } from "@medusajs/framework/utils"

/** The last time an inventory level was reported low. One row per item and
 * location; alerted_at older than the cooldown is due again. */
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
