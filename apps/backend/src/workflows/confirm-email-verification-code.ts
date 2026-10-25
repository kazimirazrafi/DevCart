import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import {
  MAX_ATTEMPTS,
  codeMatches,
  createVerificationToken,
  normalizeEmail,
} from "../lib/email-verification"
import { EMAIL_VERIFICATION_MODULE } from "../modules/email-verification"
import EmailVerificationModuleService from "../modules/email-verification/service"

export type ConfirmEmailVerificationCodeInput = {
  email: string
  code: string
}

/** Only `verified` carries a secret; the rest say what to do next. */
export type ConfirmEmailVerificationCodeResult =
  | { status: "verified"; token: string; expires_at: number }
  | { status: "invalid"; attempts_left: number }
  | { status: "expired" }
  | { status: "too_many_attempts" }

/**
 * Spends the code and returns the token. A correct code is consumed in the same
 * write, so it cannot be replayed; five wrong ones burn it. The token proves the
 * address, so cart completion needs no further read.
 */
const confirmEmailVerificationCodeStep = createStep(
  "confirm-email-verification-code",
  async (input: ConfirmEmailVerificationCodeInput, { container }) => {
    const email = normalizeEmail(input.email)
    const now = Date.now()

    const verificationService: EmailVerificationModuleService =
      container.resolve(EMAIL_VERIFICATION_MODULE)

    const [row] = await verificationService.listEmailVerifications(
      { email },
      { take: 1 }
    )

    // Logically a wrong code, and no hint that this address was tried before.
    if (!row?.code_hash) {
      return new StepResponse<ConfirmEmailVerificationCodeResult>({
        status: "invalid",
        attempts_left: 0,
      })
    }

    if (!row.expires_at || new Date(row.expires_at).getTime() <= now) {
      await verificationService.updateEmailVerifications({
        id: row.id,
        code_hash: null,
        expires_at: null,
        attempts: 0,
      })

      return new StepResponse<ConfirmEmailVerificationCodeResult>({
        status: "expired",
      })
    }

    if (row.attempts >= MAX_ATTEMPTS) {
      return new StepResponse<ConfirmEmailVerificationCodeResult>({
        status: "too_many_attempts",
      })
    }

    if (!codeMatches(email, input.code, row.code_hash)) {
      const attempts = row.attempts + 1

      await verificationService.updateEmailVerifications({
        id: row.id,
        attempts,
      })

      return new StepResponse<ConfirmEmailVerificationCodeResult>(
        attempts >= MAX_ATTEMPTS
          ? { status: "too_many_attempts" }
          : { status: "invalid", attempts_left: MAX_ATTEMPTS - attempts }
      )
    }

    await verificationService.updateEmailVerifications({
      id: row.id,
      code_hash: null,
      expires_at: null,
      attempts: 0,
    })

    const { token, expiresAt } = createVerificationToken(email)

    return new StepResponse<ConfirmEmailVerificationCodeResult>({
      status: "verified",
      token,
      expires_at: expiresAt,
    })
  }
)

export const confirmEmailVerificationCodeWorkflow = createWorkflow(
  "confirm-email-verification-code",
  (input: ConfirmEmailVerificationCodeInput) => {
    const result = confirmEmailVerificationCodeStep(input)

    return new WorkflowResponse(result)
  }
)
