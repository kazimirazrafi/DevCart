import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { confirmEmailVerificationCodeWorkflow } from "../../../../workflows/confirm-email-verification-code"
import type { StoreConfirmEmailCodeBody } from "../validators"

/**
 * POST /store/email-verification/confirm
 * Spends the mailed code and returns the token the cart gates on. Refusals say
 * what to do next, never whether the address exists.
 */
export async function POST(
  req: MedusaRequest<StoreConfirmEmailCodeBody>,
  res: MedusaResponse
) {
  const { email, code } = req.validatedBody

  const { result } = await confirmEmailVerificationCodeWorkflow(req.scope).run({
    input: { email, code },
  })

  switch (result.status) {
    case "verified":
      return res.status(200).json({
        verified: true,
        token: result.token,
        expires_at: result.expires_at,
      })

    case "invalid":
      return res.status(400).json({
        error: {
          code: "invalid_code",
          attempts_left: result.attempts_left,
          message:
            result.attempts_left > 0
              ? "That code is not right. Check the six digits and try again."
              : "That code is not right. Ask for a new code.",
        },
      })

    case "expired":
      return res.status(400).json({
        error: {
          code: "expired_code",
          message: "That code has expired. Ask for a new one.",
        },
      })

    case "too_many_attempts":
      return res.status(429).json({
        error: {
          code: "too_many_attempts",
          message:
            "Too many incorrect codes. Ask for a new code and try again.",
        },
      })
  }
}
