import { z } from "@medusajs/framework/zod"

import { REVIEW_STATUSES } from "../../../modules/review/models/review"

/** Only the two decided states: `pending` is not something an admin can set. */
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
