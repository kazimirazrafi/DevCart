import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

jest.setTimeout(180 * 1000)

const PASSWORD = "supersecret"

/**
 * The wishlist routes, exercised over HTTP against a booted Medusa app.
 *
 * Fixtures go through the same doors a browser does — customer sign-up,
 * publishable key, product creation through the product module — so the tests
 * cover the module, the links, the two workflows and the routes together.
 */
medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    let container: ReturnType<typeof getContainer>
    let storeHeaders: Record<string, string>
    let productId: string
    let otherProductId: string
    let variantId: string
    let otherVariantId: string
    let sequence = 0

    const nextEmail = (role: string) => {
      sequence += 1
      return `${role}-${sequence}@test.dev`
    }

    const signUpCustomer = async () => {
      const email = nextEmail("customer")

      const registered = await api.post(
        "/auth/customer/emailpass/register",
        { email, password: PASSWORD }
      )

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

    const authHeaders = (token: string) => ({
      ...storeHeaders,
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    })

    const list = (token: string) =>
      api.get("/store/wishlist", { headers: authHeaders(token) })

    const save = (
      token: string,
      body: Record<string, unknown>
    ) => api.post("/store/wishlist", body, { headers: authHeaders(token) })

    const remove = (token: string, id: string) =>
      api.delete(`/store/wishlist/${id}`, { headers: authHeaders(token) })

    beforeAll(async () => {
      container = getContainer()

      const salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
      const salesChannel = await salesChannelModule.createSalesChannels({
        name: "Wishlist default",
      })

      const apiKeyModule = container.resolve(Modules.API_KEY)
      const publishableKey = await apiKeyModule.createApiKeys({
        title: "Wishlist default",
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

    beforeEach(async () => {
      const productService = container.resolve(Modules.PRODUCT)
      sequence += 1

      // Variants are created with their product, the way the seed does it: the
      // module service wants option values keyed by option title, not option
      // ids, when they are written together with the product.
      const product = await productService.createProducts({
        title: `Wishlist test product ${sequence}`,
        handle: `wishlist-test-product-${sequence}`,
        status: "published",
        options: [{ title: "Size", values: ["S", "M"] }],
        variants: [
          {
            title: "S",
            sku: `wishlist-${sequence}-s`,
            options: { Size: "S" },
          },
        ],
      })

      const other = await productService.createProducts({
        title: `Wishlist other product ${sequence}`,
        handle: `wishlist-other-product-${sequence}`,
        status: "published",
        options: [{ title: "Size", values: ["S"] }],
        variants: [
          {
            title: "S",
            sku: `wishlist-other-${sequence}-s`,
            options: { Size: "S" },
          },
        ],
      })

      productId = product.id
      variantId = product.variants![0].id
      otherProductId = other.id
      otherVariantId = other.variants![0].id
    })

    describe("authentication", () => {
      it("refuses a signed-out list, save and removal", async () => {
        const signedOutList = await api
          .get("/store/wishlist", { headers: storeHeaders })
          .catch((error) => error.response)

        expect(signedOutList.status).toBe(401)

        const signedOutSave = await api
          .post(
            "/store/wishlist",
            { product_id: productId },
            { headers: { ...storeHeaders, "content-type": "application/json" } }
          )
          .catch((error) => error.response)

        expect(signedOutSave.status).toBe(401)

        const signedOutRemove = await api
          .delete("/store/wishlist/wish_does_not_exist", {
            headers: storeHeaders,
          })
          .catch((error) => error.response)

        expect(signedOutRemove.status).toBe(401)
      })
    })

    describe("POST /store/wishlist", () => {
      it("saves a product and answers 201", async () => {
        const customer = await signUpCustomer()

        const created = await save(customer.token, { product_id: productId })

        expect(created.status).toBe(201)
        expect(created.data.created).toBe(true)
        expect(created.data.item.product_id).toBe(productId)
        expect(created.data.item.variant_id).toBeNull()
        expect(created.data.item.customer_id).toBeUndefined()
      })

      it("saves the variant that was chosen on the product page", async () => {
        const customer = await signUpCustomer()

        const created = await save(customer.token, {
          product_id: productId,
          variant_id: variantId,
        })

        expect(created.data.item.variant_id).toBe(variantId)
      })

      it("answers a repeat save with the same row rather than an error", async () => {
        const customer = await signUpCustomer()

        const first = await save(customer.token, { product_id: productId })
        const second = await save(customer.token, { product_id: productId })

        expect(second.status).toBe(200)
        expect(second.data.created).toBe(false)
        expect(second.data.item.id).toBe(first.data.item.id)

        const listed = await list(customer.token)
        expect(listed.data.count).toBe(1)
      })

      it("updates the variant when the same product is saved with one", async () => {
        const customer = await signUpCustomer()

        const first = await save(customer.token, { product_id: productId })
        const second = await save(customer.token, {
          product_id: productId,
          variant_id: variantId,
        })

        expect(second.data.item.id).toBe(first.data.item.id)
        expect(second.data.item.variant_id).toBe(variantId)
      })

      it("refuses a variant that belongs to another product", async () => {
        const customer = await signUpCustomer()

        const response = await save(customer.token, {
          product_id: productId,
          variant_id: otherVariantId,
        }).catch((error) => error.response)

        expect(response.status).toBe(400)

        const listed = await list(customer.token)
        expect(listed.data.count).toBe(0)
      })

      it("refuses an unknown product", async () => {
        const customer = await signUpCustomer()

        const response = await save(customer.token, {
          product_id: "prod_does_not_exist",
        }).catch((error) => error.response)

        expect(response.status).toBe(404)
        expect(response.data.message).toContain("does not exist")
      })

      it("refuses an empty product id", async () => {
        const customer = await signUpCustomer()

        const response = await save(customer.token, {
          product_id: "   ",
        }).catch((error) => error.response)

        expect(response.status).toBe(400)
      })

      it("refuses a body that names a customer instead of saving for one", async () => {
        const customer = await signUpCustomer()
        const other = await signUpCustomer()

        /*
         * The schema names exactly two fields, and Medusa's body validation
         * refuses the rest, so `customer_id` cannot be smuggled in to write
         * into somebody else's wishlist. Refused before the workflow, which is
         * why nothing is written either way.
         */
        const response = await save(customer.token, {
          product_id: productId,
          customer_id: other.customer.id,
        }).catch((error) => error.response)

        expect(response.status).toBe(400)

        const mine = await list(customer.token)
        expect(mine.data.count).toBe(0)

        const theirs = await list(other.token)
        expect(theirs.data.count).toBe(0)
      })
    })

    describe("GET /store/wishlist", () => {
      it("starts empty", async () => {
        const customer = await signUpCustomer()

        const response = await list(customer.token)

        expect(response.status).toBe(200)
        expect(response.data.count).toBe(0)
        expect(response.data.items).toEqual([])
      })

      it("lists the customer's saves newest first", async () => {
        const customer = await signUpCustomer()

        await save(customer.token, { product_id: productId })
        await save(customer.token, { product_id: otherProductId })

        const response = await list(customer.token)

        expect(response.data.count).toBe(2)
        expect(response.data.items[0].product_id).toBe(otherProductId)
      })

      it("shows one customer nothing of another's saves", async () => {
        const customer = await signUpCustomer()
        const other = await signUpCustomer()

        await save(customer.token, { product_id: productId })

        const theirs = await list(other.token)
        expect(theirs.data.count).toBe(0)
      })
    })

    describe("DELETE /store/wishlist/:id", () => {
      it("removes a save", async () => {
        const customer = await signUpCustomer()

        const created = await save(customer.token, { product_id: productId })
        const response = await remove(customer.token, created.data.item.id)

        expect(response.status).toBe(204)

        const listed = await list(customer.token)
        expect(listed.data.count).toBe(0)
      })

      it("answers a second removal with 404", async () => {
        const customer = await signUpCustomer()

        const created = await save(customer.token, { product_id: productId })
        await remove(customer.token, created.data.item.id)

        const response = await remove(
          customer.token,
          created.data.item.id
        ).catch((error) => error.response)

        expect(response.status).toBe(404)
      })

      it("refuses to remove another customer's save", async () => {
        const customer = await signUpCustomer()
        const other = await signUpCustomer()

        const created = await save(customer.token, { product_id: productId })

        const response = await remove(
          other.token,
          created.data.item.id
        ).catch((error) => error.response)

        expect(response.status).toBe(404)

        const mine = await list(customer.token)
        expect(mine.data.count).toBe(1)
      })
    })

    describe("module links", () => {
      it("links a save to its customer and its product", async () => {
        const customer = await signUpCustomer()
        const created = await save(customer.token, {
          product_id: productId,
          variant_id: variantId,
        })

        const query = container.resolve(ContainerRegistrationKeys.QUERY)
        const { data } = await query.graph({
          entity: "wishlist_item",
          fields: ["id", "product_id", "variant_id", "customer.id", "product.id"],
          filters: { id: created.data.item.id },
        })

        expect(data).toHaveLength(1)
        expect(data[0].customer?.id).toBe(customer.customer.id)
        expect(data[0].product?.id).toBe(productId)
        expect(data[0].variant_id).toBe(variantId)
      })

      it("drops the links when the save is removed", async () => {
        const customer = await signUpCustomer()
        const created = await save(customer.token, { product_id: productId })

        await remove(customer.token, created.data.item.id)

        const query = container.resolve(ContainerRegistrationKeys.QUERY)
        const { data } = await query.graph({
          entity: "wishlist_item",
          fields: ["id", "customer.id", "product.id"],
          filters: { id: created.data.item.id },
        })

        // The row is gone, so nothing links to the customer or the product.
        expect(data).toHaveLength(0)
      })
    })
  },
})
