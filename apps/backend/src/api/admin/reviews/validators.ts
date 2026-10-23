import { z } from "@medusajs/framework/zod"

import { REVIEW_STATUSES } from "../../../modules/review/models/review"

/**
 * Moderation only moves a review between the two decided states: an admin
 * cannot hand-write `pending` through this route, because "pending" is what a
 * review is before anyone has looked at it.
 */
export const AdminModerateReviewSchema = z.object({
  status: z.enum(
    REVIEW_STATUSES.filter((status) => status !== "pending") as [
      "approved",
      "rejected",
    ],
    {
      error: "Choose approved or rejected.",
    }
  ),
})

export type AdminModerateReviewBody = z.infer<typeof AdminModerateReviewSchema>
