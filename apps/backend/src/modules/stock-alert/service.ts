import { MedusaService } from "@medusajs/framework/utils"

import { StockAlert } from "./models/stock-alert"

/** Stock alert service. Only generated CRUD; decisions live in low-stock.ts
 * and the job in src/jobs. */
class StockAlertModuleService extends MedusaService({ StockAlert }) {}

export default StockAlertModuleService
