import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"

jest.setTimeout(180 * 1000)

/**
 * The admin sales summary over HTTP: who may read it, what it refuses, and what
 * an empty window looks like.
 *
 * The arithmetic itself is unit-tested against the aggregation function, and
 * the numbers are reconciled against the database and the dashboard in the
 * verification run — this suite is about the route's contract, which is where a
 * dashboard genuinely breaks (a 401 nobody notices, a range that silently
 * becomes the wrong window).
 */
medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    let adminHeaders: Record<string, string>

    beforeAll(async () => {
      const apiKeyModule = getContainer().resolve(Modules.API_KEY)
      const secretKey = await apiKeyModule.createApiKeys({
        title: "Sales summary",
        type: "secret",
        created_by: "integration-test",
      })

      adminHeaders = {
        authorization: `Basic ${Buffer.from(`${secretKey.token}:`).toString(
          "base64"
        )}`,
      }
    })

    it("refuses a signed-out read", async () => {
      const response = await api
        .get("/admin/sales-summary")
        .catch((error) => error.response)

      expect(response.status).toBe(401)
    })

    it("answers an empty window with zeros, not an error", async () => {
      const response = await api.get(
        "/admin/sales-summary?from=2020-01-01T00:00:00.000Z&to=2020-02-01T00:00:00.000Z",
        { headers: adminHeaders }
      )

      expect(response.status).toBe(200)
      expect(response.data.order_count).toBe(0)
      expect(response.data.revenue).toEqual([])
      expect(response.data.top_products).toEqual([])
      expect(response.data.truncated).toBe(false)
      expect(response.data.range.from).toBe("2020-01-01T00:00:00.000Z")
      expect(response.data.range.to).toBe("2020-02-01T00:00:00.000Z")
    })

    it("defaults to the last 30 days", async () => {
      const response = await api.get("/admin/sales-summary", {
        headers: adminHeaders,
      })

      expect(response.status).toBe(200)

      const from = new Date(response.data.range.from).getTime()
      const to = new Date(response.data.range.to).getTime()

      expect(to - from).toBe(30 * 24 * 60 * 60 * 1000)
      expect(Math.abs(Date.now() - to)).toBeLessThan(60 * 1000)
    })

    it("refuses a date it cannot read", async () => {
      const response = await api
        .get("/admin/sales-summary?from=yesterday", { headers: adminHeaders })
        .catch((error) => error.response)

      expect(response.status).toBe(400)
      expect(response.data.message).toMatch(/not a from date/i)
    })

    it("refuses a window that runs backwards", async () => {
      const response = await api
        .get(
          "/admin/sales-summary?from=2026-10-10T00:00:00.000Z&to=2026-10-01T00:00:00.000Z",
          { headers: adminHeaders }
        )
        .catch((error) => error.response)

      expect(response.status).toBe(400)
      expect(response.data.message).toMatch(/after the to date/i)
    })

    it("refuses a window longer than a year", async () => {
      const response = await api
        .get(
          "/admin/sales-summary?from=2020-01-01T00:00:00.000Z&to=2026-10-01T00:00:00.000Z",
          { headers: adminHeaders }
        )
        .catch((error) => error.response)

      expect(response.status).toBe(400)
      expect(response.data.message).toMatch(/366 days or fewer/i)
    })

    it("caps the number of best sellers it returns", async () => {
      const response = await api.get("/admin/sales-summary?limit=500", {
        headers: adminHeaders,
      })

      expect(response.status).toBe(200)
      expect(response.data.top_products.length).toBeLessThanOrEqual(20)
    })
  },
})
