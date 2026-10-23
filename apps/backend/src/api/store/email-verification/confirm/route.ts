import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { confirmEmailVerificationCodeWorkflow } from "../../../../workflows/confirm-email-verification-code"
import type { StoreConfirmEmailCodeBody } from "../validators"

/**
 * POST /store/email-verification/confirm
 *
 * Spends the code that was mailed to this address. A correct code is consumed
 * and answered with a token; the storefront keeps that token in an HttpOnly
 * cookie and sends it back when it completes the cart, which is what the
 * completion gate reads.
 *
 * Every refusal names the next step rather than the cause: a wrong code says
 * how many tries are left, an expired one asks for a new one, and a burned one
 * says to stop guessing. None of them says whether the address exists, has an
 * account, or was tried before.
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
