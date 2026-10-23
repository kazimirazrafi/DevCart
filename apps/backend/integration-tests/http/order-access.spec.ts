import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

import { createOrderAccessToken } from "../../src/lib/order-access"

jest.setTimeout(180 * 1000)

const PASSWORD = "supersecret"
const ACCESS_SECRET = "integration-test-order-access-secret-0123456789"

/*
 * Order reads, exercised over HTTP against a booted Medusa app.
 *
 * `GET /store/orders/:id` ships unauthenticated so guests can open their
 * confirmation page, which makes the order id a credential. The suite proves
 * the store no longer accepts the id alone: the owner's token or a signed-in
 * session is required, and every refusal looks exactly like a missing order.
 *
 * The token secret is pinned for the file, because the middleware reads it from
 * the environment at request time and a developer's own `.env` should not
 * decide whether these assertions hold.
 */
process.env.ORDER_ACCESS_SECRET = ACCESS_SECRET

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    let container: ReturnType<typeof getContainer>
    let storeHeaders: Record<string, string>
    let sequence = 0

    const nextEmail = (role: string) => {
      sequence += 1
      return `${role}-${sequence}@test.dev`
    }

    const signUpCustomer = async () => {
      const email = nextEmail("customer")

      const registered = await api.post("/auth/customer/emailpass/register", {
        email,
        password: PASSWORD,
      })

      const created = await api.post(
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

      return {
        email,
        token: signedIn.data.token as string,
        customer: created.data.customer,
      }
    }

    /* A guest's order: it was placed with an email, so it has no owner. */
    const createGuestOrder = async (email = nextEmail("guest")) => {
      const orderService = container.resolve(Modules.ORDER)

      return await orderService.createOrders({
        currency_code: "usd",
        email,
      })
    }

    const createCustomerOrder = async (customerId: string, email: string) => {
      const orderService = container.resolve(Modules.ORDER)

      return await orderService.createOrders({
        currency_code: "usd",
        customer_id: customerId,
        email,
      })
    }

    const readOrder = (
      orderId: string,
      headers: Record<string, string> = {}
    ) =>
      api.get(`/store/orders/${orderId}`, {
        headers: { ...storeHeaders, ...headers },
        validateStatus: () => true,
      })

    beforeAll(async () => {
      container = getContainer()

      const salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
      const salesChannel = await salesChannelModule.createSalesChannels({
        name: "Order access default",
      })

      const apiKeyModule = container.resolve(Modules.API_KEY)
      const publishableKey = await apiKeyModule.createApiKeys({
        title: "Order access default",
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

    it("does not hand an order to a request that only knows its id", async () => {
      const order = await createGuestOrder()

      const response = await readOrder(order.id)

      expect(response.status).toBe(404)
      // Nothing about the order itself: not its email, its items or its totals.
      expect(JSON.stringify(response.data)).not.toContain(order.email!)
      expect(response.data.order).toBeUndefined()
    })

    it("answers an unknown id the same way as an order that is not yours", async () => {
      const order = await createGuestOrder()

      const refused = await readOrder(order.id)
      const missing = await readOrder("order_01NOSUCHORDER000000000000")

      expect(refused.status).toBe(404)
      expect(missing.status).toBe(404)
      expect(refused.status).toBe(missing.status)
    })

    it("hands the order to the signed-in customer who owns it", async () => {
      const buyer = await signUpCustomer()
      const order = await createCustomerOrder(buyer.customer.id, buyer.email)

      const response = await readOrder(order.id, {
        authorization: `Bearer ${buyer.token}`,
      })

      expect(response.status).toBe(200)
      expect(response.data.order.id).toBe(order.id)
    })

    it("does not hand one customer's order to another signed-in customer", async () => {
      const buyer = await signUpCustomer()
      const stranger = await signUpCustomer()
      const order = await createCustomerOrder(buyer.customer.id, buyer.email)

      const response = await readOrder(order.id, {
        authorization: `Bearer ${stranger.token}`,
      })

      expect(response.status).toBe(404)
      expect(JSON.stringify(response.data)).not.toContain(order.email!)
    })

    it("does not treat a signed-in customer as the owner of a guest order", async () => {
      const stranger = await signUpCustomer()
      const order = await createGuestOrder()

      const response = await readOrder(order.id, {
        authorization: `Bearer ${stranger.token}`,
      })

      expect(response.status).toBe(404)
    })

    it("hands a guest their order when the request carries its token", async () => {
      const order = await createGuestOrder()

      const response = await readOrder(order.id, {
        "x-order-access-token": createOrderAccessToken(order.id),
      })

      expect(response.status).toBe(200)
      expect(response.data.order.id).toBe(order.id)
      expect(response.data.order.email).toBe(order.email)
    })

    it("refuses a token minted for a different order", async () => {
      const order = await createGuestOrder()
      const other = await createGuestOrder()

      const response = await readOrder(order.id, {
        "x-order-access-token": createOrderAccessToken(other.id),
      })

      expect(response.status).toBe(404)
      expect(JSON.stringify(response.data)).not.toContain(order.email!)
    })

    it("refuses an expired token", async () => {
      const order = await createGuestOrder()
      const token = createOrderAccessToken(order.id, {
        now: Date.now() - 31 * 24 * 60 * 60 * 1000,
      })

      const response = await readOrder(order.id, {
        "x-order-access-token": token,
      })

      expect(response.status).toBe(404)
    })

    it("refuses a token signed with another secret", async () => {
      const order = await createGuestOrder()
      const token = createOrderAccessToken(order.id)
      const [, expiresAt] = token.split(".")
      const forged = `v1.${expiresAt}.${"a".repeat(43)}`

      const response = await readOrder(order.id, {
        "x-order-access-token": forged,
      })

      expect(response.status).toBe(404)
    })

    it("does not let a token in the query string stand in for the header", async () => {
      const order = await createGuestOrder()
      const token = createOrderAccessToken(order.id)

      const response = await api.get(
        `/store/orders/${order.id}?token=${encodeURIComponent(token)}`,
        {
          headers: storeHeaders,
          validateStatus: () => true,
        }
      )

      // Refused as a query parameter (unknown query keys are not a credential)
      // and refused again as an unauthenticated read.
      expect(response.status).toBeGreaterThanOrEqual(400)
      expect(JSON.stringify(response.data)).not.toContain(order.email!)
    })

    it("still lets the route answer a batch of fields for the owner", async () => {
      const buyer = await signUpCustomer()
      const order = await createCustomerOrder(buyer.customer.id, buyer.email)

      const response = await api.get(`/store/orders/${order.id}`, {
        headers: {
          ...storeHeaders,
          authorization: `Bearer ${buyer.token}`,
        },
        params: { fields: "id,email,+payment_status" },
        validateStatus: () => true,
      })

      expect(response.status).toBe(200)
      expect(response.data.order.id).toBe(order.id)
    })
  },
})
