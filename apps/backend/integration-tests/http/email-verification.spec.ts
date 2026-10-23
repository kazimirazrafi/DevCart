import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

import {
  MAX_ATTEMPTS,
  MAX_SENDS_PER_WINDOW,
  RESEND_COOLDOWN_MS,
  createVerificationToken,
} from "../../src/lib/email-verification"
import { EMAIL_VERIFICATION_MODULE } from "../../src/modules/email-verification"
import EmailVerificationModuleService from "../../src/modules/email-verification/service"

jest.setTimeout(180 * 1000)

const SECRET = "integration-test-email-verification-secret-0123456789"
const PASSWORD = "supersecret"

/*
 * Guest email verification, over HTTP against a booted app.
 *
 * The code is never in a response, so these tests read it where the customer
 * does: the notification the store just composed for that address. The mail
 * provider is pinned to Medusa's local one so nothing leaves the machine — it
 * stores the notification and logs it, which is the same path a real inbox
 * takes, minus delivery.
 *
 * The token the customer keeps after confirming is then spent at the only
 * place that matters: completing the cart.
 */
process.env.EMAIL_VERIFICATION_SECRET = SECRET
// Empty rather than deleted: `loadEnv` skips keys that are already present, so
// an empty value keeps the Resend provider out of this suite.
process.env.RESEND_API_KEY = ""
process.env.RESEND_FROM = ""

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    let container: ReturnType<typeof getContainer>
    let storeHeaders: Record<string, string>
    let sequence = 0

    const nextEmail = (role: string) => {
      sequence += 1
      return `${role}-${sequence}@test.dev`
    }

    const verificationService = () =>
      container.resolve<EmailVerificationModuleService>(
        EMAIL_VERIFICATION_MODULE
      )

    const requestCode = (email: string) =>
      api.post(
        "/store/email-verification/request",
        { email },
        { headers: storeHeaders, validateStatus: () => true }
      )

    const confirmCode = (email: string, code: string) =>
      api.post(
        "/store/email-verification/confirm",
        { email, code },
        { headers: storeHeaders, validateStatus: () => true }
      )

    /** The code the customer would read in their inbox. */
    const mailedCode = async (email: string): Promise<string> => {
      const notificationService = container.resolve(Modules.NOTIFICATION)

      const [notification] = await notificationService.listNotifications(
        { to: email },
        { take: 1, order: { created_at: "DESC" } }
      )

      const data = notification?.data as { code?: string } | undefined

      if (!data?.code) {
        throw new Error(`No verification code was composed for ${email}.`)
      }

      return data.code
    }

    /**
     * Clears the resend cooldown, which is otherwise the only way to ask for a
     * second code inside one test. The limit itself is asserted separately.
     */
    const clearCooldown = async (email: string) => {
      const [row] = await verificationService().listEmailVerifications({
        email,
      })

      await verificationService().updateEmailVerifications({
        id: row.id,
        last_sent_at: new Date(Date.now() - RESEND_COOLDOWN_MS - 1000),
      })
    }

    const createCart = async (email: string) => {
      const cartModule = container.resolve(Modules.CART)

      return await cartModule.createCarts({ currency_code: "usd", email })
    }

    const completeCart = (
      cartId: string,
      headers: Record<string, string> = {}
    ) =>
      api.post(
        `/store/carts/${cartId}/complete`,
        {},
        {
          headers: { ...storeHeaders, ...headers },
          validateStatus: () => true,
        }
      )

    beforeAll(async () => {
      container = getContainer()

      const salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
      const salesChannel = await salesChannelModule.createSalesChannels({
        name: "Email verification default",
      })

      const apiKeyModule = container.resolve(Modules.API_KEY)
      const publishableKey = await apiKeyModule.createApiKeys({
        title: "Email verification default",
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

    it("mails a six-digit code and never puts it in the response", async () => {
      const email = nextEmail("guest")

      const response = await requestCode(email)

      expect(response.status).toBe(201)
      expect(response.data.sent).toBe(true)
      expect(response.data.expires_in_seconds).toBe(600)

      const code = await mailedCode(email)

      expect(code).toMatch(/^\d{6}$/)
      expect(JSON.stringify(response.data)).not.toContain(code)
    })

    it("answers an address that has an account exactly like a new one", async () => {
      const email = nextEmail("customer")

      await api.post("/auth/customer/emailpass/register", {
        email,
        password: PASSWORD,
      })

      const response = await requestCode(email)

      expect(response.status).toBe(201)
      expect(Object.keys(response.data).sort()).toEqual(
        ["expires_in_seconds", "resend_after_seconds", "sent"].sort()
      )
    })

    it("refuses a malformed address before mailing anything", async () => {
      const response = await requestCode("not-an-address")

      expect(response.status).toBe(400)
      // Rejected by the body validator, so no row and no mail were produced.
      expect(
        await verificationService().listEmailVerifications({
          email: "not-an-address",
        })
      ).toEqual([])
    })

    it("refuses a second code inside the cooldown, and says how long to wait", async () => {
      const email = nextEmail("guest")

      expect((await requestCode(email)).status).toBe(201)

      const second = await requestCode(email)

      expect(second.status).toBe(429)
      expect(second.data.error.code).toBe("resend_cooldown")
      expect(second.data.error.retry_after_seconds).toBeGreaterThan(0)
      expect(second.data.error.retry_after_seconds).toBeLessThanOrEqual(60)
    })

    it("stops mailing codes to one address after the hourly limit", async () => {
      const email = nextEmail("guest")

      for (let i = 0; i < MAX_SENDS_PER_WINDOW; i += 1) {
        const sent = await requestCode(email)

        expect(sent.status).toBe(201)
        await clearCooldown(email)
      }

      const refused = await requestCode(email)

      expect(refused.status).toBe(429)
      expect(refused.data.error.code).toBe("too_many_codes")
    })

    it("refuses a wrong code and counts the attempt", async () => {
      const email = nextEmail("guest")

      await requestCode(email)

      const response = await confirmCode(email, "000000")

      expect(response.status).toBe(400)
      expect(response.data.error.code).toBe("invalid_code")
      expect(response.data.error.attempts_left).toBe(MAX_ATTEMPTS - 1)
    })

    it("verifies with the mailed code and spends it", async () => {
      const email = nextEmail("guest")

      await requestCode(email)
      const code = await mailedCode(email)

      const confirmed = await confirmCode(email, code)

      expect(confirmed.status).toBe(200)
      expect(confirmed.data.verified).toBe(true)
      expect(typeof confirmed.data.token).toBe("string")
      expect(confirmed.data.expires_at).toBeGreaterThan(Date.now())

      // Single use: the same code never works twice, even immediately.
      const replayed = await confirmCode(email, code)

      expect(replayed.status).toBe(400)
      expect(replayed.data.error.code).toBe("invalid_code")
    })

    it("burns the code after the attempt limit, so the right code stops working", async () => {
      const email = nextEmail("guest")

      await requestCode(email)
      const code = await mailedCode(email)

      for (let attempt = 1; attempt < MAX_ATTEMPTS; attempt += 1) {
        const wrong = await confirmCode(email, "000000")
        expect(wrong.status).toBe(400)
      }

      const last = await confirmCode(email, "000000")

      expect(last.status).toBe(429)
      expect(last.data.error.code).toBe("too_many_attempts")

      const right = await confirmCode(email, code)

      expect(right.status).toBe(429)
      expect(right.data.error.code).toBe("too_many_attempts")
    })

    it("says when a code has expired", async () => {
      const email = nextEmail("guest")

      await requestCode(email)
      const code = await mailedCode(email)

      const [row] = await verificationService().listEmailVerifications({
        email,
      })

      await verificationService().updateEmailVerifications({
        id: row.id,
        expires_at: new Date(Date.now() - 1000),
      })

      const response = await confirmCode(email, code)

      expect(response.status).toBe(400)
      expect(response.data.error.code).toBe("expired_code")
    })

    it("does not complete a guest cart whose address was never verified", async () => {
      const email = nextEmail("guest")
      const cart = await createCart(email)

      const response = await completeCart(cart.id)

      expect(response.status).toBe(403)
      expect(response.data.type).toBe("email_verification_required")
    })

    it("does not accept a token minted for a different address", async () => {
      const email = nextEmail("guest")
      const cart = await createCart(email)
      const otherEmail = nextEmail("other")

      const response = await completeCart(cart.id, {
        "x-email-verification-token": createVerificationToken(otherEmail).token,
      })

      expect(response.status).toBe(403)
      expect(response.data.type).toBe("email_verification_required")
    })

    it("lets a verified guest through to the rest of the completion", async () => {
      const email = nextEmail("guest")

      await requestCode(email)
      const code = await mailedCode(email)
      const confirmed = await confirmCode(email, code)

      const cart = await createCart(email)

      const response = await completeCart(cart.id, {
        "x-email-verification-token": confirmed.data.token,
      })

      // The cart is empty, so completion fails for its own reasons — but no
      // longer at the verification gate, which is what this asserts.
      expect(response.status).not.toBe(403)
      expect(response.data.type).not.toBe("email_verification_required")
    })

    it("lets a signed-in customer complete without a verification token", async () => {
      const email = nextEmail("customer")

      const registered = await api.post("/auth/customer/emailpass/register", {
        email,
        password: PASSWORD,
      })

      // The customer record is what makes the identity a customer; the gate
      // reads the actor the authenticate middleware resolved.
      const customer = await api.post(
        "/store/customers",
        { email, first_name: "Ada", last_name: "Byron" },
        {
          headers: {
            ...storeHeaders,
            authorization: `Bearer ${registered.data.token}`,
          },
        }
      )

      const signedIn = await api.post("/auth/customer/emailpass", {
        email,
        password: PASSWORD,
      })

      const cartModule = container.resolve(Modules.CART)
      const cart = await cartModule.createCarts({
        currency_code: "usd",
        email,
        customer_id: customer.data.customer.id,
      })

      const response = await completeCart(cart.id, {
        authorization: `Bearer ${signedIn.data.token}`,
      })

      // No token needed: the address belongs to the account the order is
      // tied to, which is the same exemption the storefront relies on.
      expect(response.status).not.toBe(403)
      expect(response.data.type).not.toBe("email_verification_required")
    })

    it("does not gate a completion when the cart has no email yet", async () => {
      const cartModule = container.resolve(Modules.CART)
      const cart = await cartModule.createCarts({ currency_code: "usd" })

      const response = await completeCart(cart.id)

      expect(response.data.type).not.toBe("email_verification_required")
    })
  },
})
