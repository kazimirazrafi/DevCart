import { z } from "@medusajs/framework/zod"

/*
 * Both bodies carry an address the customer typed and an optional code. Nothing
 * else: who may finish a checkout is decided by the token a confirmation
 * returns, not by anything this body could claim.
 *
 * The code is validated as exactly six digits here so a malformed code never
 * reaches the comparison, which would otherwise spend one of the five attempts.
 */

export const StoreRequestEmailCodeSchema = z.object({
  email: z
    .email({ error: "Enter an email address like name@example.com." })
    .trim()
    .toLowerCase(),
})

export const StoreConfirmEmailCodeSchema = z.object({
  email: z
    .email({ error: "Enter an email address like name@example.com." })
    .trim()
    .toLowerCase(),
  code: z
    .string({ error: "Enter the six-digit code we emailed you." })
    .trim()
    .regex(/^\d{6}$/, "Enter the six-digit code we emailed you."),
})

export type StoreRequestEmailCodeBody = z.infer<
  typeof StoreRequestEmailCodeSchema
>

export type StoreConfirmEmailCodeBody = z.infer<
  typeof StoreConfirmEmailCodeSchema
>
