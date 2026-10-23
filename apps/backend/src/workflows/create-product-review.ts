import {
  createStep,
  createWorkflow,
  StepResponse,
  transform,
  when,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { createRemoteLinkStep } from "@medusajs/medusa/core-flows"
import type { LinkDefinition } from "@medusajs/framework/types"

import { REVIEW_MODULE } from "../modules/review"
import type { ReviewStatus } from "../modules/review/models/review"
import ReviewModuleService from "../modules/review/service"

export type CreateProductReviewInput = {
  product_id: string
  customer_id: string
  rating: number
  title: string
  body: string
}

type ExistingReview = {
  id: string
  rating: number
  title: string
  body: string
  status: ReviewStatus
}

type WrittenReviewCompensation = {
  createdId: string | null
  previous: ExistingReview | null
}

/**
 * A review has to be of something real, and a customer gets one per product.
 * Both checks live here rather than in the route because they are the rule,
 * not the transport.
 *
 * A rejected review is the exception to "one": the customer was told no, and
 * leaving them no way to try again would be a dead end. The write step re-opens
 * that row instead of adding a second one, so a customer still holds at most
 * one review per product.
 */
const assertReviewableStep = createStep(
  "assert-reviewable",
  async (input: CreateProductReviewInput, { container }) => {
    const productService = container.resolve(Modules.PRODUCT)

    try {
      await productService.retrieveProduct(input.product_id)
    } catch {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "This product does not exist."
      )
    }

    const reviewService: ReviewModuleService = container.resolve(REVIEW_MODULE)
    const [existing] = await reviewService.listReviews(
      { product_id: input.product_id, customer_id: input.customer_id },
      { take: 1 }
    )

    if (existing && existing.status !== "rejected") {
      throw new MedusaError(
        MedusaError.Types.DUPLICATE_ERROR,
        "You have already reviewed this product."
      )
    }

    const previous: ExistingReview | null = existing
      ? {
          id: existing.id,
          rating: existing.rating,
          title: existing.title,
          body: existing.body,
          status: existing.status as ReviewStatus,
        }
      : null

    return new StepResponse(previous)
  }
)

type WriteReviewStepInput = {
  input: CreateProductReviewInput
  previous: ExistingReview | null
}

/**
 * Writes the review as `pending`: moderation is what makes it public, so a
 * customer cannot approve their own words.
 */
const writeReviewStep = createStep(
  "write-review",
  async ({ input, previous }: WriteReviewStepInput, { container }) => {
    const reviewService: ReviewModuleService = container.resolve(REVIEW_MODULE)

    // Trimmed here as well as in the route's schema: the rule is the module's,
    // not one transport's.
    const title = input.title.trim()
    const body = input.body.trim()

    if (previous) {
      const review = await reviewService.updateReviews({
        id: previous.id,
        rating: input.rating,
        title,
        body,
        status: "pending",
      })

      return new StepResponse(review, {
        createdId: null,
        previous,
      } satisfies WrittenReviewCompensation)
    }

    const review = await reviewService.createReviews({
      product_id: input.product_id,
      customer_id: input.customer_id,
      rating: input.rating,
      title,
      body,
      status: "pending",
    })

    return new StepResponse(review, {
      createdId: review.id,
      previous: null,
    } satisfies WrittenReviewCompensation)
  },
  async (compensation: WrittenReviewCompensation | undefined, { container }) => {
    if (!compensation) {
      return
    }

    const reviewService: ReviewModuleService = container.resolve(REVIEW_MODULE)

    if (compensation.createdId) {
      await reviewService.deleteReviews([compensation.createdId])
      return
    }

    // Re-opening a rejected review is undone by putting the row back exactly as
    // it was, so a failed run leaves no half-written review behind.
    if (compensation.previous) {
      await reviewService.updateReviews({
        id: compensation.previous.id,
        rating: compensation.previous.rating,
        title: compensation.previous.title,
        body: compensation.previous.body,
        status: compensation.previous.status,
      })
    }
  }
)

export const createProductReviewWorkflow = createWorkflow(
  "create-product-review",
  (input: CreateProductReviewInput) => {
    const previous = assertReviewableStep(input)
    const review = writeReviewStep(
      transform({ input, previous }, (data) => data)
    )

    /*
     * The module's two columns are not enough on their own: the links are what
     * let a product find its reviews and a review find its author, so they are
     * written with the review, in the same workflow.
     *
     * Re-opening a rejected review already has them, so they are only created
     * for a genuinely new row.
     */
    const links = transform(
      { input, review },
      (data): LinkDefinition[] => [
        {
          [Modules.PRODUCT]: { product_id: data.input.product_id },
          [REVIEW_MODULE]: { review_id: data.review.id },
        },
        {
          [Modules.CUSTOMER]: { customer_id: data.input.customer_id },
          [REVIEW_MODULE]: { review_id: data.review.id },
        },
      ]
    )

    when("is-new-review", { previous }, (data) => !data.previous).then(() => {
      createRemoteLinkStep(links)
    })

    return new WorkflowResponse(review)
  }
)
