import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

import { NEWSLETTER_MODULE } from "../../src/modules/newsletter"
import NewsletterModuleService from "../../src/modules/newsletter/service"

jest.setTimeout(180 * 1000)

/** Newsletter signup over HTTP. The list is anonymous, so no customer session
 * is used. */
medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    let container: ReturnType<typeof getContainer>
    let storeHeaders: Record<string, string>

    const subscribe = (body: Record<string, unknown>) =>
      api.post("/store/newsletter", body, { headers: storeHeaders })

    const subscribers = async () => {
      const newsletterService: NewsletterModuleService =
        container.resolve(NEWSLETTER_MODULE)

      return newsletterService.listNewsletterSubscribers({})
    }

    beforeAll(async () => {
      container = getContainer()

      const salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
      const salesChannel = await salesChannelModule.createSalesChannels({
        name: "Newsletter default",
      })

      const apiKeyModule = container.resolve(Modules.API_KEY)
      const publishableKey = await apiKeyModule.createApiKeys({
        title: "Newsletter default",
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

    it("adds an address without an account", async () => {
      const response = await subscribe({ email: "Ada@Example.com" })

      expect(response.status).toBe(201)
      expect(response.data).toEqual({ subscribed: true, created: true })

      const stored = await subscribers()

      expect(stored).toHaveLength(1)
      // Trimmed and lowercased on the way in, so the same address typed with a
      // capital is the same row rather than a second one.
      expect(stored[0].email).toBe("ada@example.com")
    })

    it("treats a repeat signup as already subscribed", async () => {
      await subscribe({ email: "grace@example.com" })

      const repeat = await subscribe({ email: "  GRACE@example.com  " })

      expect(repeat.status).toBe(200)
      expect(repeat.data).toEqual({ subscribed: true, created: false })

      const stored = await subscribers()

      expect(stored.filter((row) => row.email === "grace@example.com")).toHaveLength(
        1
      )
    })

    it("rejects a body without a usable address", async () => {
      const missing = await subscribe({}).catch((error) => error.response)
      const malformed = await subscribe({ email: "not-an-address" }).catch(
        (error) => error.response
      )

      expect(missing.status).toBe(400)
      expect(malformed.status).toBe(400)
      expect(await subscribers()).toHaveLength(0)
    })
  },
})
