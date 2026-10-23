import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { takeToken } from "../../../../lib/rate-limit"
import { requestEmailVerificationCodeWorkflow } from "../../../../workflows/request-email-verification-code"
import type { StoreRequestEmailCodeBody } from "../validators"

/*
 * Per-caller limit in front of the per-address one. A customer needs one or two
 * codes; a script walking a list of addresses needs a wall, and the address
 * limits cannot see the walk because every address is new to them.
 */
const CALLER_WINDOW = { limit: 20, windowMs: 10 * 60 * 1000 }

/**
 * POST /store/email-verification/request
 *
 * Mails a six-digit code to the address the customer is checking out with. The
 * answer is the same whether the address is new, belongs to an account, or was
 * verified yesterday, so the endpoint cannot be used to find out which
 * addresses this store has seen.
 *
 * A code is only ever mailed to the address in the body; the address is not
 * written to the cart here, because `POST /store/carts/:id` is what owns that.
 */
export async function POST(
  req: MedusaRequest<StoreRequestEmailCodeBody>,
  res: MedusaResponse
) {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const { email } = req.validatedBody

  const caller = req.ip || "unknown"
  const callerLimit = await takeToken(
    `email-verification:${caller}`,
    CALLER_WINDOW
  )

  if (!callerLimit.allowed) {
    res.setHeader("Retry-After", String(callerLimit.retry_after_seconds))

    return res.status(429).json({
      error: {
        code: "too_many_requests",
        message:
          "Too many verification codes were requested just now. Try again in a few minutes.",
        retry_after_seconds: callerLimit.retry_after_seconds,
      },
    })
  }

  try {
    const { result } = await requestEmailVerificationCodeWorkflow(
      req.scope
    ).run({ input: { email } })

    if (result.status === "rate_limited") {
      res.setHeader("Retry-After", String(result.retry_after_seconds))

      return res.status(429).json({
        error: {
          code:
            result.reason === "cooldown" ? "resend_cooldown" : "too_many_codes",
          message:
            result.reason === "cooldown"
              ? `We sent a code to this address a moment ago. Check your inbox, or ask again in ${result.retry_after_seconds} seconds.`
              : `Too many codes were sent to this address. Try again in ${Math.ceil(
                  result.retry_after_seconds / 60
                )} minutes.`,
          retry_after_seconds: result.retry_after_seconds,
        },
      })
    }

    /*
     * `sent` rather than the workflow's own `status`: the storefront only needs
     * to know that something was mailed and when it may ask again. The code is
     * not here — it exists only in the inbox and as an HMAC in the database.
     */
    return res.status(201).json({
      sent: true,
      resend_after_seconds: result.resend_after_seconds,
      expires_in_seconds: result.expires_in_seconds,
    })
  } catch (error) {
    /*
     * The row was rolled back by the step's compensation, so this is not a
     * cooldown: the customer can try again as soon as the provider is back.
     * The provider's own reason is logged; the customer is told only that the
     * message did not go out.
     */
    const reason =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: unknown }).message)
          : String(error)

    logger.error(`Could not send an email verification code: ${reason}`)
    logger.error(
      `Verification mail failure detail: ${
        error instanceof Error ? error.stack : JSON.stringify(error)
      }`
    )

    return res.status(502).json({
      error: {
        code: "send_failed",
        message:
          "We could not send the code just now. Try again in a moment, or use a different address.",
      },
    })
  }
}
