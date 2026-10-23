import { Module } from "@medusajs/framework/utils"

import StockAlertModuleService from "./service"

export const STOCK_ALERT_MODULE = "stock_alert"

export default Module(STOCK_ALERT_MODULE, {
  service: StockAlertModuleService,
})
