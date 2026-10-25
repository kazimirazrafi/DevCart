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
 * The product must exist and a customer gets one review per product. A rejected
 * review is re-opened rather than duplicated, so the rule still holds.
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

/** Written as `pending`: moderation is what makes a review public. */
const writeReviewStep = createStep(
  "write-review",
  async ({ input, previous }: WriteReviewStepInput, { container }) => {
    const reviewService: ReviewModuleService = container.resolve(REVIEW_MODULE)

    // Trimmed here too: the rule belongs to the module, not the transport.
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

    // Put the rejected row back exactly as it was.
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

    // Links let a product find its reviews and a review its author. Only a new
    // row needs them; a re-opened review already has them.
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
