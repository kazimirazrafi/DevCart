import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

jest.setTimeout(180 * 1000)

/** The per-caller limits from src/api/middlewares.ts, over HTTP. */
medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    let storeHeaders: Record<string, string>

    // The test client rejects on a non-2xx answer, and a refusal is what this
    // suite is here to read.
    const subscribe = (email: string) =>
      api
        .post("/store/newsletter", { email }, { headers: storeHeaders })
        .catch((error) => error.response)

    beforeAll(async () => {
      const container = getContainer()

      const salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
      const salesChannel = await salesChannelModule.createSalesChannels({
        name: "Rate limit default",
      })

      const apiKeyModule = container.resolve(Modules.API_KEY)
      const publishableKey = await apiKeyModule.createApiKeys({
        title: "Rate limit default",
        type: "publishable",
        created_by: "integration-test",
      })

      const link = container.resolve(ContainerRegistrationKeys.LINK)

      await link.create([
        {
          [Modules.API_KEY]: { publishable_key_id: publishableKey.id },
          [Modules.SALES_CHANNEL]: {
            sales_channel_id: salesChannel.id,
          },
        },
      ])

      storeHeaders = {
        "x-publishable-api-key": publishableKey.token,
      }
    })

    it("refuses the newsletter sign-up after the caller's allowance, with a wait", async () => {
      for (let index = 0; index < 10; index += 1) {
        const allowed = await subscribe(`list-${index}@test.dev`)

        expect(allowed.status).toBe(201)
      }

      const refused = await subscribe("list-11@test.dev")

      expect(refused.status).toBe(429)
      expect(refused.data.error.code).toBe("too_many_requests")
      expect(refused.data.error.retry_after_seconds).toBeGreaterThan(0)
      expect(Number(refused.headers["retry-after"])).toBeGreaterThan(0)

      // Nothing was written for the refused address.
      const container = getContainer()
      const query = container.resolve(ContainerRegistrationKeys.QUERY)
      const { data: subscribers } = await query.graph({
        entity: "newsletter_subscriber",
        fields: ["email"],
        filters: { email: "list-11@test.dev" },
      })

      expect(subscribers).toHaveLength(0)
    })

    it("counts each bucket on its own", async () => {
      // The newsletter allowance is spent by the test above; sign-in is a
      // different counter and must still answer on its merits.
      const signIn = await api
        .post("/auth/customer/emailpass", {
          email: "nobody@test.dev",
          password: "wrong-password",
        })
        .catch((error) => error.response)

      expect(signIn.status).toBe(401)
    })
  },
})
