import { z } from "@medusajs/framework/zod"

/**
 * Nothing here sets `status` or `customer_id`: authorship and moderation are
 * the server's.
 */
export const StoreCreateReviewSchema = z.object({
  rating: z.coerce
    .number({ error: "Choose a rating from 1 to 5." })
    .int("Choose a whole rating from 1 to 5.")
    .min(1, "Choose a rating from 1 to 5.")
    .max(5, "Choose a rating from 1 to 5."),
  title: z
    .string({ error: "Add a title for your review." })
    .trim()
    .min(3, "Give your review a title of at least 3 characters.")
    .max(120, "Keep the title under 120 characters."),
  body: z
    .string({ error: "Write your review." })
    .trim()
    .min(10, "Write at least 10 characters about the product.")
    .max(2000, "Keep your review under 2000 characters."),
})

export type StoreCreateReviewBody = z.infer<typeof StoreCreateReviewSchema>
