import { moduleIntegrationTestRunner } from "@medusajs/test-utils"

import { REVIEW_MODULE } from ".."
import { Review } from "../models/review"
import ReviewModuleService from "../service"

jest.setTimeout(60 * 1000)

moduleIntegrationTestRunner<ReviewModuleService>({
  moduleName: REVIEW_MODULE,
  moduleModels: [Review],
  resolve: "./src/modules/review",
  testSuite: ({ service }) => {
    describe("Review module service", () => {
      it("writes a review as pending", async () => {
        const review = await service.createReviews({
          product_id: "prod_1",
          customer_id: "cus_1",
          rating: 4,
          title: "Good shirt",
          body: "Fits as expected and the cotton is thick.",
        })

        expect(typeof review.id).toBe("string")
        expect(review.id.length).toBeGreaterThan(0)
        expect(review.status).toBe("pending")
        expect(review.rating).toBe(4)
        expect(review.product_id).toBe("prod_1")
        expect(review.customer_id).toBe("cus_1")
        expect(review.created_at).toBeTruthy()
      })

      it("keeps the words that were written", async () => {
        const review = await service.createReviews({
          product_id: "prod_1",
          customer_id: "cus_2",
          rating: 2,
          title: "Runs small",
          body: "Ordered a large and it fits like a medium.",
        })

        const stored = await service.retrieveReview(review.id)

        expect(stored.title).toBe("Runs small")
        expect(stored.body).toBe("Ordered a large and it fits like a medium.")
        expect(stored.rating).toBe(2)
      })

      it("lists only the reviews it is asked for", async () => {
        await service.createReviews([
          {
            product_id: "prod_a",
            customer_id: "cus_a",
            rating: 5,
            title: "Approved one",
            body: "This review has been approved by an admin.",
            status: "approved",
          },
          {
            product_id: "prod_a",
            customer_id: "cus_b",
            rating: 1,
            title: "Pending one",
            body: "This review is still waiting for moderation.",
            status: "pending",
          },
          {
            product_id: "prod_b",
            customer_id: "cus_c",
            rating: 3,
            title: "Other product",
            body: "This review belongs to a different product.",
            status: "approved",
          },
        ])

        const approvedForA = await service.listReviews({
          product_id: "prod_a",
          status: "approved",
        })

        expect(approvedForA).toHaveLength(1)
        expect(approvedForA[0].title).toBe("Approved one")
      })

      it("moves a review between statuses", async () => {
        const review = await service.createReviews({
          product_id: "prod_c",
          customer_id: "cus_d",
          rating: 5,
          title: "Lovely",
          body: "Exactly the colour that the photos showed.",
        })

        const approved = await service.updateReviews({
          id: review.id,
          status: "approved",
        })

        expect(approved.status).toBe("approved")

        const rejected = await service.updateReviews({
          id: review.id,
          status: "rejected",
        })

        expect(rejected.status).toBe("rejected")
      })

      it("deletes a review", async () => {
        const review = await service.createReviews({
          product_id: "prod_d",
          customer_id: "cus_e",
          rating: 3,
          title: "Fine",
          body: "Nothing wrong with it, nothing special either.",
        })

        await service.deleteReviews([review.id])

        await expect(service.retrieveReview(review.id)).rejects.toThrow()
      })

      it("counts a product's reviews", async () => {
        await service.createReviews([
          {
            product_id: "prod_e",
            customer_id: "cus_f",
            rating: 5,
            title: "One",
            body: "The first review written for this product.",
          },
          {
            product_id: "prod_e",
            customer_id: "cus_g",
            rating: 4,
            title: "Two",
            body: "The second review written for this product.",
          },
        ])

        const [, count] = await service.listAndCountReviews({
          product_id: "prod_e",
        })

        expect(count).toBe(2)
      })
    })
  },
})
