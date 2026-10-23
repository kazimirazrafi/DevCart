import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { moderateProductReviewWorkflow } from "../../../../workflows/moderate-product-review"
import type { AdminModerateReviewBody } from "../validators"

/**
 * POST /admin/reviews/:id
 *
 * Approving and rejecting are one write with a different word, so they are one
 * route: `{ status: "approved" | "rejected" }`. Approval is what makes a review
 * visible on the storefront; rejection keeps it out without deleting what the
 * customer wrote, so the row still explains itself if it is looked at again.
 */
export async function POST(
  req: AuthenticatedMedusaRequest<AdminModerateReviewBody>,
  res: MedusaResponse
) {
  const { result: review } = await moderateProductReviewWorkflow(req.scope).run({
    input: {
      id: req.params.id,
      status: req.validatedBody.status,
    },
  })

  res.json({ review })
}
