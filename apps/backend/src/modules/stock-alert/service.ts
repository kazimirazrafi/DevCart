import { MedusaService } from "@medusajs/framework/utils"

import { StockAlert } from "./models/stock-alert"

/**
 * The stock alert module's service. The generated CRUD is all it needs: the
 * decision of *what* is low and *whether* it is due lives in `low-stock.ts`
 * (pure functions, so they are unit-testable) and the scheduled job in
 * `src/jobs/low-stock-alert.ts` is what reads the inventory and sends the mail.
 */
class StockAlertModuleService extends MedusaService({ StockAlert }) {}

export default StockAlertModuleService
