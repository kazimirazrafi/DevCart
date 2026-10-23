import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"

import { REVIEW_MODULE } from "../modules/review"
import type { ReviewStatus } from "../modules/review/models/review"
import ReviewModuleService from "../modules/review/service"

export type ModerateProductReviewInput = {
  id: string
  status: Extract<ReviewStatus, "approved" | "rejected">
}

const moderateReviewStep = createStep(
  "moderate-review",
  async (input: ModerateProductReviewInput, { container }) => {
    const reviewService: ReviewModuleService = container.resolve(REVIEW_MODULE)

    const review = await reviewService
      .retrieveReview(input.id)
      .catch(() => null)

    if (!review) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Review ${input.id} was not found.`
      )
    }

    const previousStatus = review.status as ReviewStatus

    const updated = await reviewService.updateReviews({
      id: input.id,
      status: input.status,
    })

    return new StepResponse(updated, { id: input.id, previousStatus })
  },
  async (
    compensation: { id: string; previousStatus: ReviewStatus } | undefined,
    { container }
  ) => {
    if (!compensation) {
      return
    }

    const reviewService: ReviewModuleService = container.resolve(REVIEW_MODULE)

    await reviewService.updateReviews({
      id: compensation.id,
      status: compensation.previousStatus,
    })
  }
)

/**
 * Approving and rejecting are the same write with a different word, so they are
 * one workflow. The step refuses an id that does not exist rather than letting
 * a mistyped route answer 200 about nothing.
 */
export const moderateProductReviewWorkflow = createWorkflow(
  "moderate-product-review",
  (input: ModerateProductReviewInput) => {
    const review = moderateReviewStep(input)

    return new WorkflowResponse(review)
  }
)
