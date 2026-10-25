import { z } from "@medusajs/framework/zod"

/*
 * The code is validated as six digits here, so a malformed one never reaches the
 * comparison and spends an attempt.
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
