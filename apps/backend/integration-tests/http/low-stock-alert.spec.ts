import { createServer, type Server } from "node:http"

import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"

import lowStockAlertJob, { config } from "../../src/jobs/low-stock-alert"
import { STOCK_ALERT_MODULE } from "../../src/modules/stock-alert"

jest.setTimeout(180 * 1000)

/*
 * The project's notification provider in this environment is Resend with a real
 * key and an unverified domain, which refuses any recipient but its owner. The
 * job deliberately records nothing when the mail fails, so the success path —
 * and with it the dedupe — can only be tested against a provider that accepts.
 * The provider already takes its base URL from the environment (it was built
 * that way so a stub could stand in), so this file points it at a local server
 * and keeps what it was sent: the inventory, the template and the provider are
 * then all exercised through their real code path.
 *
 * The values are restored afterwards so later suites see the real provider.
 */
const STUB_PORT = 9099
const STUB_BASE_URL = `http://127.0.0.1:${STUB_PORT}`
const previousBaseUrl = process.env.RESEND_BASE_URL
process.env.RESEND_BASE_URL = STUB_BASE_URL

const sent: { subject: string; html: string; text: string; to: string[] }[] = []
let stub: Server | null = null

/**
 * The low-stock job, run the way the scheduler runs it.
 *
 * The suite lives in `integration-tests/http/` because that is the only
 * app-level Jest runner this project has; the job itself is not an HTTP route.
 * It boots a real Medusa app, writes inventory through the inventory module,
 * runs the job function against that container, and reads the notification
 * module back as the independent source — so the selection, the email and the
 * dedupe are all exercised together.
 *
 * Every assertion is a **delta** from the counts at the start of the test: the
 * runner keeps one database for the whole file, so a test that asserted "one
 * notification exists" would be reading the previous test's mail as well.
 */
medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    let container: ReturnType<typeof getContainer>

    let locationId: string
    let lowItemId: string
    let lowItemSku: string
    let sequence = 0

    const alertAddress = "stock@test.dev"

    const createItem = async (title: string, stocked: number) => {
      sequence += 1
      const sku = `LOW-STOCK-${sequence}`

      const inventoryService = container.resolve(Modules.INVENTORY)
      const item = await inventoryService.createInventoryItems({ sku, title })

      await inventoryService.createInventoryLevels({
        inventory_item_id: item.id,
        location_id: locationId,
        stocked_quantity: stocked,
      })

      return { id: item.id, sku }
    }

    const notificationCount = async () => {
      const notificationService = container.resolve(Modules.NOTIFICATION)
      const [, count] = await notificationService.listAndCountNotifications({
        template: "low-stock-alert",
      })

      return count
    }

    const notifications = async () => {
      const notificationService = container.resolve(Modules.NOTIFICATION)
      const [rows] = await notificationService.listAndCountNotifications({
        template: "low-stock-alert",
        to: alertAddress,
      })

      return rows
    }

    const alertsFor = async (inventoryItemId: string) => {
      const alertService = container.resolve(STOCK_ALERT_MODULE)
      const [rows, count] = await alertService.listAndCountStockAlerts({
        inventory_item_id: inventoryItemId,
      })

      return { rows, count }
    }

    beforeAll(async () => {
      container = getContainer()

      stub = createServer((request, response) => {
        let body = ""

        request.on("data", (chunk) => {
          body += chunk
        })

        request.on("end", () => {
          try {
            sent.push(JSON.parse(body))
          } catch {
            sent.push({ subject: "", html: "", text: body, to: [] })
          }

          response.writeHead(200, { "content-type": "application/json" })
          response.end(JSON.stringify({ id: `stub-${sent.length}` }))
        })
      })

      await new Promise<void>((resolve) => {
        stub!.listen(STUB_PORT, "127.0.0.1", resolve)
      })

      // The job is off unless an admin address is configured, which is also
      // why a fresh clone never mails anyone.
      process.env.LOW_STOCK_ALERT_EMAIL = alertAddress
      process.env.LOW_STOCK_THRESHOLD = "5"
      process.env.LOW_STOCK_ALERT_COOLDOWN_HOURS = "24"
    })

    afterAll(async () => {
      if (stub) {
        await new Promise<void>((resolve) => stub!.close(() => resolve()))
        stub = null
      }

      if (previousBaseUrl === undefined) {
        delete process.env.RESEND_BASE_URL
      } else {
        process.env.RESEND_BASE_URL = previousBaseUrl
      }
    })

    beforeEach(async () => {
      sent.length = 0

      const stockLocationService = container.resolve(Modules.STOCK_LOCATION)
      const location = await stockLocationService.createStockLocations({
        name: `Low stock location ${++sequence}`,
      })

      locationId = location.id

      const low = await createItem("Running out / S", 2)
      lowItemId = low.id
      lowItemSku = low.sku

      await createItem("Plenty / M", 40)
    })

    it("mails the admin once for a level that is low", async () => {
      const before = await notificationCount()

      await lowStockAlertJob(container)

      expect((await notificationCount()) - before).toBe(1)

      const rows = await notifications()
      const latest = rows[rows.length - 1]

      expect(latest.to).toBe(alertAddress)
      expect(latest.channel).toBe("email")

      const data = latest.data as {
        threshold: number
        items: { title: string; available: number; sku: string }[]
      }

      expect(data.threshold).toBe(5)

      const mine = data.items.filter((item) => item.sku === lowItemSku)
      expect(mine).toHaveLength(1)
      expect(mine[0].title).toBe("Running out / S")
      expect(mine[0].available).toBe(2)
    })

    it("sends the email the template describes", async () => {
      await lowStockAlertJob(container)

      expect(sent).toHaveLength(1)

      const email = sent[0]

      expect(email.to).toEqual([alertAddress])
      expect(email.subject).toMatch(/running low/i)
      expect(email.html).toContain("Running out / S")
      expect(email.html).toContain("2 left")
      expect(email.text).toContain(lowItemSku)
      expect(email.text).not.toContain("Plenty / M")
    })

    it("says nothing about a level above the threshold", async () => {
      await lowStockAlertJob(container)

      const rows = await notifications()
      const data = rows[rows.length - 1].data as {
        items: { title: string }[]
      }

      expect(data.items.map((item) => item.title)).not.toContain("Plenty / M")
    })

    it("does not repeat itself inside the cooldown", async () => {
      const before = await notificationCount()

      await lowStockAlertJob(container)
      await lowStockAlertJob(container)
      await lowStockAlertJob(container)

      expect((await notificationCount()) - before).toBe(1)
      expect(sent).toHaveLength(1)

      const { count, rows } = await alertsFor(lowItemId)
      expect(count).toBe(1)
      expect(rows[0].location_id).toBe(locationId)
      expect(rows[0].quantity).toBe(2)
    })

    it("reports the level again once the cooldown has passed", async () => {
      const before = await notificationCount()

      await lowStockAlertJob(container)

      const alertService = container.resolve(STOCK_ALERT_MODULE)
      const { rows } = await alertsFor(lowItemId)

      // A day and a minute ago, written the way the job writes it.
      await alertService.updateStockAlerts({
        id: rows[0].id,
        alerted_at: new Date(Date.now() - 24 * 60 * 60 * 1000 - 60 * 1000),
      })

      await lowStockAlertJob(container)

      expect((await notificationCount()) - before).toBe(2)
      expect(sent).toHaveLength(2)

      const after = await alertsFor(lowItemId)
      expect(after.count).toBe(1)
    })

    it("stays quiet when stock recovers and drops again inside the day", async () => {
      const before = await notificationCount()
      const inventoryService = container.resolve(Modules.INVENTORY)

      await lowStockAlertJob(container)

      await inventoryService.updateInventoryLevels({
        inventory_item_id: lowItemId,
        location_id: locationId,
        stocked_quantity: 50,
      })

      // Nothing is low where this item used to be, so nothing new is said.
      await lowStockAlertJob(container)

      await inventoryService.updateInventoryLevels({
        inventory_item_id: lowItemId,
        location_id: locationId,
        stocked_quantity: 3,
      })

      // Low again, but the cooldown still applies: one shortage, one email.
      await lowStockAlertJob(container)

      expect((await notificationCount()) - before).toBe(1)
      expect(sent).toHaveLength(1)
    })

    it("does nothing at all when no admin address is configured", async () => {
      const before = await notificationCount()
      const configured = process.env.LOW_STOCK_ALERT_EMAIL
      delete process.env.LOW_STOCK_ALERT_EMAIL

      try {
        await lowStockAlertJob(container)

        expect((await notificationCount()) - before).toBe(0)
        expect((await alertsFor(lowItemId)).count).toBe(0)
      } finally {
        process.env.LOW_STOCK_ALERT_EMAIL = configured
      }
    })

    it("is a scheduled job with a name and a cron", () => {
      expect(config.name).toBe("low-stock-alert")
      expect(config.schedule).toBe(
        process.env.LOW_STOCK_ALERT_SCHEDULE || "0 * * * *"
      )
    })
  },
})
