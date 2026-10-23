import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

jest.setTimeout(180 * 1000)

const PASSWORD = "supersecret"

/**
 * The review routes, exercised over HTTP against a booted Medusa app.
 *
 * Fixtures go through the same doors a browser does — customer sign-up, admin
 * sign-in — rather than writing rows straight into the database, so the tests
 * cover the module, the links, the workflows and the routes together.
 */
medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    let container: ReturnType<typeof getContainer>
    let storeHeaders: Record<string, string>
    let adminHeaders: Record<string, string>
    let productId: string
    let sequence = 0

    const nextEmail = (role: string) => {
      sequence += 1
      return `${role}-${sequence}@test.dev`
    }

    const signUp = async (role: "customer" | "user") => {
      const email = nextEmail(role)
      const route = role === "customer" ? "customer" : "user"

      const registered = await api.post(
        `/auth/${route}/emailpass/register`,
        { email, password: PASSWORD }
      )

      return { email, token: registered.data.token as string }
    }

    const signUpCustomer = async (firstName = "Ada", lastName = "Byron") => {
      const { email, token } = await signUp("customer")

      const created = await api.post(
        "/store/customers",
        { email, first_name: firstName, last_name: lastName },
        {
          headers: {
            ...storeHeaders,
            authorization: `Bearer ${token}`,
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

    const postReview = (
      token: string,
      body: Record<string, unknown>,
      product = productId
    ) =>
      api.post(`/store/products/${product}/reviews`, body, {
        headers: {
          ...storeHeaders,
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
      })

    const moderate = (reviewId: string, status: "approved" | "rejected") =>
      api.post(
        `/admin/reviews/${reviewId}`,
        { status },
        {
          headers: {
            ...adminHeaders,
            "content-type": "application/json",
          },
        }
      )

    const listReviews = (query = "", product = productId) =>
      api.get(`/store/products/${product}/reviews${query}`, {
        headers: storeHeaders,
      })

    const validReview = {
      rating: 5,
      title: "Exactly what the photos promised",
      body: "The cotton is thick and the fit is true to size.",
    }

    beforeAll(async () => {
      container = getContainer()

      const salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
      const salesChannel = await salesChannelModule.createSalesChannels({
        name: "Reviews default",
      })

      const apiKeyModule = container.resolve(Modules.API_KEY)
      const publishableKey = await apiKeyModule.createApiKeys({
        title: "Reviews default",
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

      /*
       * Admin routes accept a secret API key over HTTP Basic, which is an
       * admin identity that needs no password round-trip in a test. The route
       * under test has nothing user-specific in it, so this is the whole
       * authentication it needs.
       */
      const secretKey = await apiKeyModule.createApiKeys({
        title: "Reviews moderation",
        type: "secret",
        created_by: "integration-test",
      })

      adminHeaders = {
        authorization: `Basic ${Buffer.from(`${secretKey.token}:`).toString(
          "base64"
        )}`,
      }
    })

    beforeEach(async () => {
      const productService = container.resolve(Modules.PRODUCT)
      const product = await productService.createProducts({
        title: `Review test product ${++sequence}`,
        handle: `review-test-product-${sequence}`,
        status: "published",
      })

      productId = product.id
    })

    describe("POST /store/products/:id/reviews", () => {
      it("refuses a review from a signed-out visitor", async () => {
        const response = await api
          .post(`/store/products/${productId}/reviews`, validReview, {
            headers: { ...storeHeaders, "content-type": "application/json" },
          })
          .catch((error) => error.response)

        expect(response.status).toBe(401)
      })

      it("refuses a review of a product that does not exist", async () => {
        const customer = await signUpCustomer()

        const response = await postReview(
          customer.token,
          validReview,
          "prod_does_not_exist"
        ).catch((error) => error.response)

        expect(response.status).toBe(404)
        expect(response.data.message).toContain("does not exist")
      })

      it("rejects a rating outside 1 to 5 and a title that is too short", async () => {
        const customer = await signUpCustomer()

        const tooHigh = await postReview(customer.token, {
          ...validReview,
          rating: 6,
        }).catch((error) => error.response)

        expect(tooHigh.status).toBe(400)

        const tooLow = await postReview(customer.token, {
          ...validReview,
          rating: 0,
        }).catch((error) => error.response)

        expect(tooLow.status).toBe(400)

        const shortTitle = await postReview(customer.token, {
          ...validReview,
          title: "ok",
        }).catch((error) => error.response)

        expect(shortTitle.status).toBe(400)

        const shortBody = await postReview(customer.token, {
          ...validReview,
          body: "short",
        }).catch((error) => error.response)

        expect(shortBody.status).toBe(400)

        // Nothing was written by any of them.
        const listed = await listReviews()
        expect(listed.data.count).toBe(0)
      })

      it("writes a review as pending, out of the public list", async () => {
        const customer = await signUpCustomer()

        const created = await postReview(customer.token, {
          ...validReview,
          title: "  Exactly what the photos promised  ",
          body: "  The cotton is thick and the fit is true to size.  ",
        })

        expect(created.status).toBe(201)
        expect(created.data.review.status).toBe("pending")
        expect(created.data.review.customer_id).toBe(customer.customer.id)
        expect(created.data.review.product_id).toBe(productId)
        expect(created.data.review.title).toBe(
          "Exactly what the photos promised"
        )

        const listed = await listReviews()
        expect(listed.data.count).toBe(0)
        expect(listed.data.reviews).toEqual([])
      })

      it("refuses a second review of the same product by the same customer", async () => {
        const customer = await signUpCustomer()

        await postReview(customer.token, validReview)

        const second = await postReview(customer.token, {
          ...validReview,
          title: "And one more thing",
          body: "Adding a second opinion about the same product.",
        }).catch((error) => error.response)

        expect(second.status).toBe(422)
        expect(second.data.message).toContain("already reviewed")
      })

      it("lets a rejected customer write again, on the same row", async () => {
        const customer = await signUpCustomer()

        const first = await postReview(customer.token, validReview)
        const reviewId = first.data.review.id

        await moderate(reviewId, "rejected")

        const second = await postReview(customer.token, {
          ...validReview,
          rating: 3,
          title: "Second thoughts, in nicer words",
          body: "The fit grew on me after the first wash.",
        })

        expect(second.status).toBe(201)
        expect(second.data.review.id).toBe(reviewId)
        expect(second.data.review.status).toBe("pending")
        expect(second.data.review.rating).toBe(3)
        expect(second.data.review.title).toBe(
          "Second thoughts, in nicer words"
        )
      })
    })

    describe("GET /store/products/:id/reviews", () => {
      it("lists approved reviews with the author's name, newest first", async () => {
        const first = await signUpCustomer("Ada", "Byron")
        const second = await signUpCustomer("Grace", "Hopper")

        const older = await postReview(first.token, {
          ...validReview,
          rating: 4,
          title: "Older approved review",
          body: "This one was written first and approved first.",
        })
        const newer = await postReview(second.token, {
          ...validReview,
          rating: 5,
          title: "Newer approved review",
          body: "This one was written second and approved second.",
        })
        const pending = await postReview(
          await signUpCustomer("Alan", "Turing").then((c) => c.token),
          {
            ...validReview,
            title: "Still pending",
            body: "Nobody has looked at this review yet.",
          }
        )

        await moderate(older.data.review.id, "approved")
        await moderate(newer.data.review.id, "approved")

        const listed = await listReviews()

        expect(listed.data.count).toBe(2)
        expect(listed.data.reviews.map((r: { title: string }) => r.title)).toEqual(
          ["Newer approved review", "Older approved review"]
        )
        expect(listed.data.reviews[0].author_name).toBe("Grace H.")
        expect(listed.data.reviews[1].author_name).toBe("Ada B.")
        expect(
          listed.data.reviews.map((r: { id: string }) => r.id)
        ).not.toContain(pending.data.review.id)

        // No customer data beyond the public name.
        expect(listed.data.reviews[0].customer).toBeUndefined()
        expect(listed.data.reviews[0].customer_id).toBeUndefined()
      })

      it("summarises the whole product, not the page", async () => {
        const authors = await Promise.all([
          signUpCustomer("Ada", "Byron"),
          signUpCustomer("Grace", "Hopper"),
          signUpCustomer("Alan", "Turing"),
        ])

        const ratings = [5, 4, 1]

        for (const [index, author] of authors.entries()) {
          const created = await postReview(author.token, {
            ...validReview,
            rating: ratings[index],
            title: `Review number ${index + 1}`,
            body: `This is review number ${index + 1} for the product.`,
          })

          await moderate(created.data.review.id, "approved")
        }

        const listed = await listReviews("?limit=1")

        expect(listed.data.reviews).toHaveLength(1)
        expect(listed.data.count).toBe(3)
        expect(listed.data.summary.count).toBe(3)
        expect(listed.data.summary.average).toBe(3.3)
        expect(listed.data.summary.distribution).toMatchObject({
          1: 1,
          2: 0,
          3: 0,
          4: 1,
          5: 1,
        })
      })

      it("drops a rejected review from the public list", async () => {
        const customer = await signUpCustomer()

        const created = await postReview(customer.token, validReview)
        await moderate(created.data.review.id, "approved")

        expect((await listReviews()).data.count).toBe(1)

        await moderate(created.data.review.id, "rejected")

        const listed = await listReviews()
        expect(listed.data.count).toBe(0)
        expect(listed.data.summary.count).toBe(0)
        expect(listed.data.summary.average).toBe(0)
      })

      it("paginates with limit and offset", async () => {
        const authors = await Promise.all([
          signUpCustomer(),
          signUpCustomer(),
          signUpCustomer(),
        ])

        for (const author of authors) {
          const created = await postReview(author.token, validReview)
          await moderate(created.data.review.id, "approved")
        }

        const firstPage = await listReviews("?limit=2&offset=0")
        const secondPage = await listReviews("?limit=2&offset=2")

        expect(firstPage.data.reviews).toHaveLength(2)
        expect(secondPage.data.reviews).toHaveLength(1)
        expect(firstPage.data.count).toBe(3)
        expect(secondPage.data.offset).toBe(2)

        const ids = new Set(
          [
            ...firstPage.data.reviews.map((r: { id: string }) => r.id),
            ...secondPage.data.reviews.map((r: { id: string }) => r.id),
          ]
        )
        expect(ids.size).toBe(3)
      })
    })

    describe("GET /store/reviews/summary", () => {
      const summary = () =>
        api.get("/store/reviews/summary", { headers: storeHeaders })

      it("counts published reviews and averages them", async () => {
        const before = await summary()

        const product = await container.resolve(Modules.PRODUCT).createProducts({
          title: "Summary test product",
          handle: `summary-test-product-${++sequence}`,
          status: "published",
        })

        const authors = await Promise.all([
          signUpCustomer(),
          signUpCustomer(),
        ])

        const fiveStars = await postReview(
          authors[0].token,
          { ...validReview, rating: 5, title: "Five stars" },
          product.id
        )
        const fourStars = await postReview(
          authors[1].token,
          { ...validReview, rating: 4, title: "Four stars" },
          product.id
        )

        await moderate(fiveStars.data.review.id, "approved")
        await moderate(fourStars.data.review.id, "approved")

        const after = await summary()

        expect(after.status).toBe(200)
        expect(after.data.count).toBe(before.data.count + 2)
        expect(after.data.distribution["5"]).toBe(
          (before.data.distribution["5"] ?? 0) + 1
        )
        expect(after.data.distribution["4"]).toBe(
          (before.data.distribution["4"] ?? 0) + 1
        )

        const total = Object.entries(after.data.distribution).reduce(
          (sum, [rating, count]) => sum + Number(rating) * Number(count),
          0
        )

        expect(after.data.average).toBeCloseTo(
          Math.round((total / after.data.count) * 10) / 10,
          5
        )
      })

      it("leaves pending reviews out of the numbers", async () => {
        const before = await summary()

        const product = await container.resolve(Modules.PRODUCT).createProducts({
          title: "Unapproved summary product",
          handle: `unapproved-summary-product-${++sequence}`,
          status: "published",
        })

        const authors = await Promise.all([
          signUpCustomer(),
          signUpCustomer(),
        ])

        await postReview(authors[0].token, validReview, product.id)
        await postReview(authors[1].token, validReview, product.id)

        const after = await summary()

        expect(after.data.count).toBe(before.data.count)
        expect(after.data.average).toBe(before.data.average)
      })
    })

    describe("GET /admin/reviews", () => {
      it("refuses a signed-out request", async () => {
        const response = await api
          .get("/admin/reviews")
          .catch((error) => error.response)

        expect(response.status).toBe(401)
      })

      it("lists every status for one product, filtered", async () => {
        const approvedAuthor = await signUpCustomer("Ada", "Byron")
        const pendingAuthor = await signUpCustomer("Grace", "Hopper")
        const otherAuthor = await signUpCustomer("Alan", "Turing")

        const approved = await postReview(approvedAuthor.token, {
          ...validReview,
          title: "Approved review",
          body: "An admin has already approved this one.",
        })
        const pending = await postReview(pendingAuthor.token, {
          ...validReview,
          title: "Pending review",
          body: "Nobody has looked at this one yet.",
        })

        await moderate(approved.data.review.id, "approved")

        // A review of another product must not appear in this product's queue.
        const otherProduct = await container
          .resolve(Modules.PRODUCT)
          .createProducts({
            title: "Another review product",
            handle: `another-review-product-${++sequence}`,
            status: "published",
          })

        await postReview(
          otherAuthor.token,
          { ...validReview, title: "Other product review", body: "This is about a different product." },
          otherProduct.id
        )

        const everything = await api.get(
          `/admin/reviews?product_id=${productId}`,
          { headers: adminHeaders }
        )

        expect(everything.status).toBe(200)
        expect(everything.data.count).toBe(2)
        expect(
          everything.data.reviews.map((r: { id: string }) => r.id).sort()
        ).toEqual([approved.data.review.id, pending.data.review.id].sort())
        expect(everything.data.reviews[0].customer.first_name).toBeTruthy()

        const pendingOnly = await api.get(
          `/admin/reviews?product_id=${productId}&status=pending`,
          { headers: adminHeaders }
        )

        expect(pendingOnly.data.count).toBe(1)
        expect(pendingOnly.data.reviews[0].id).toBe(pending.data.review.id)

        const rejectedOnly = await api.get(
          `/admin/reviews?product_id=${productId}&status=rejected`,
          { headers: adminHeaders }
        )

        expect(rejectedOnly.data.count).toBe(0)
      })

      it("refuses a status that is not a review status", async () => {
        const response = await api
          .get(`/admin/reviews?product_id=${productId}&status=published`, {
            headers: adminHeaders,
          })
          .catch((error) => error.response)

        expect(response.status).toBe(400)
      })
    })

    describe("POST /admin/reviews/:id", () => {
      it("refuses a signed-out moderation", async () => {
        const customer = await signUpCustomer()
        const created = await postReview(customer.token, validReview)

        const response = await api
          .post(
            `/admin/reviews/${created.data.review.id}`,
            { status: "approved" },
            { headers: { "content-type": "application/json" } }
          )
          .catch((error) => error.response)

        expect(response.status).toBe(401)
      })

      it("refuses an unknown review", async () => {
        const response = await api
          .post(
            "/admin/reviews/rev_does_not_exist",
            { status: "approved" },
            {
              headers: {
                ...adminHeaders,
                "content-type": "application/json",
              },
            }
          )
          .catch((error) => error.response)

        expect(response.status).toBe(404)
      })

      it("refuses a status that is not a decision", async () => {
        const customer = await signUpCustomer()
        const created = await postReview(customer.token, validReview)

        const response = await api
          .post(
            `/admin/reviews/${created.data.review.id}`,
            { status: "pending" },
            {
              headers: {
                ...adminHeaders,
                "content-type": "application/json",
              },
            }
          )
          .catch((error) => error.response)

        expect(response.status).toBe(400)
      })

      it("approves and rejects the same review", async () => {
        const customer = await signUpCustomer()
        const created = await postReview(customer.token, validReview)

        const approved = await moderate(created.data.review.id, "approved")
        expect(approved.status).toBe(200)
        expect(approved.data.review.status).toBe("approved")

        const rejected = await moderate(created.data.review.id, "rejected")
        expect(rejected.status).toBe(200)
        expect(rejected.data.review.status).toBe("rejected")
      })
    })
  },
})
