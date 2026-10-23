import { moduleIntegrationTestRunner } from "@medusajs/test-utils"

import { STOCK_ALERT_MODULE } from ".."
import { StockAlert } from "../models/stock-alert"
import StockAlertModuleService from "../service"

jest.setTimeout(60 * 1000)

moduleIntegrationTestRunner<StockAlertModuleService>({
  moduleName: STOCK_ALERT_MODULE,
  moduleModels: [StockAlert],
  resolve: "./src/modules/stock-alert",
  testSuite: ({ service }) => {
    describe("Stock alert module service", () => {
      it("records when a level was reported", async () => {
        const alertedAt = new Date("2026-10-20T09:00:00.000Z")

        const alert = await service.createStockAlerts({
          inventory_item_id: "iitem_1",
          location_id: "loc_1",
          quantity: 2,
          alerted_at: alertedAt,
        })

        expect(typeof alert.id).toBe("string")
        expect(alert.inventory_item_id).toBe("iitem_1")
        expect(alert.location_id).toBe("loc_1")
        expect(alert.quantity).toBe(2)
        expect(new Date(alert.alerted_at).toISOString()).toBe(
          alertedAt.toISOString()
        )
      })

      it("refuses a second row for the same item and location", async () => {
        await service.createStockAlerts({
          inventory_item_id: "iitem_2",
          location_id: "loc_1",
          quantity: 1,
          alerted_at: new Date(),
        })

        await expect(
          service.createStockAlerts({
            inventory_item_id: "iitem_2",
            location_id: "loc_1",
            quantity: 1,
            alerted_at: new Date(),
          })
        ).rejects.toThrow()
      })

      it("allows the same item at a different location", async () => {
        await service.createStockAlerts([
          {
            inventory_item_id: "iitem_3",
            location_id: "loc_1",
            quantity: 1,
            alerted_at: new Date(),
          },
          {
            inventory_item_id: "iitem_3",
            location_id: "loc_2",
            quantity: 3,
            alerted_at: new Date(),
          },
        ])

        const rows = await service.listStockAlerts({
          inventory_item_id: "iitem_3",
        })

        expect(rows).toHaveLength(2)
      })

      it("moves the alert forward on a later report", async () => {
        const first = await service.createStockAlerts({
          inventory_item_id: "iitem_4",
          location_id: "loc_1",
          quantity: 4,
          alerted_at: new Date("2026-10-19T09:00:00.000Z"),
        })

        const later = new Date("2026-10-20T09:00:00.000Z")

        const updated = await service.updateStockAlerts({
          id: first.id,
          quantity: 1,
          alerted_at: later,
        })

        expect(updated.quantity).toBe(1)
        expect(new Date(updated.alerted_at).toISOString()).toBe(
          later.toISOString()
        )

        const [, count] = await service.listAndCountStockAlerts({
          inventory_item_id: "iitem_4",
        })

        expect(count).toBe(1)
      })

      it("lists the alerts of the items it is asked about", async () => {
        await service.createStockAlerts([
          {
            inventory_item_id: "iitem_5",
            location_id: "loc_1",
            quantity: 0,
            alerted_at: new Date(),
          },
          {
            inventory_item_id: "iitem_6",
            location_id: "loc_1",
            quantity: 2,
            alerted_at: new Date(),
          },
        ])

        const rows = await service.listStockAlerts({
          inventory_item_id: ["iitem_5"],
        })

        expect(rows).toHaveLength(1)
        expect(rows[0].inventory_item_id).toBe("iitem_5")
      })
    })
  },
})
