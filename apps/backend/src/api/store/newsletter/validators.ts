import { z } from "@medusajs/framework/zod"

/*
 * Trim and lowercase before validating, so a pasted address is normalised
 * rather than refused. Zod checks before `.trim()` at the end of a chain, hence
 * the pipe.
 */
export const StoreSubscribeNewsletterSchema = z.object({
  email: z
    .string({ error: "Enter an email address like name@example.com." })
    .trim()
    .toLowerCase()
    .pipe(
      z.email({ error: "Enter an email address like name@example.com." })
    ),
})

export type StoreSubscribeNewsletterBody = z.infer<
  typeof StoreSubscribeNewsletterSchema
>
