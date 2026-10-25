import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { takeToken } from "../../../../lib/rate-limit"
import { requestEmailVerificationCodeWorkflow } from "../../../../workflows/request-email-verification-code"
import type { StoreRequestEmailCodeBody } from "../validators"

/*
 * Per-caller limit before the per-address one: the address limits cannot see a
 * script walking a list, because every address is new to them.
 */
const CALLER_WINDOW = { limit: 20, windowMs: 10 * 60 * 1000 }

/**
 * POST /store/email-verification/request
 * Mails a six-digit code. The answer is the same for every address, so the
 * endpoint does not reveal which addresses the store has seen.
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

    // The code itself is never returned, only what it existed as an HMAC.
    return res.status(201).json({
      sent: true,
      resend_after_seconds: result.resend_after_seconds,
      expires_in_seconds: result.expires_in_seconds,
    })
  } catch (error) {
    // The step's compensation rolled the row back, so this is not a cooldown.
    // The provider's reason is logged; the customer is told the mail failed.
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
