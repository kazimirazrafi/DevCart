import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { moderateProductReviewWorkflow } from "../../../../workflows/moderate-product-review"
import type { AdminModerateReviewBody } from "../validators"

/**
 * POST /admin/reviews/:id
 * Approve or reject in one write. Rejection keeps the row for the record.
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
