import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"

import {
  CODE_TTL_MS,
  MAX_SENDS_PER_WINDOW,
  RESEND_COOLDOWN_MS,
  SEND_WINDOW_MS,
  generateCode,
  hashCode,
  normalizeEmail,
} from "../lib/email-verification"
import { EMAIL_VERIFICATION_MODULE } from "../modules/email-verification"
import EmailVerificationModuleService from "../modules/email-verification/service"
import { EMAIL_TEMPLATES } from "../modules/notification-resend/templates"

export type RequestEmailVerificationCodeInput = {
  email: string
}

/**
 * The two reasons a send can be refused. Both say when asking again would be
 * allowed, because "too many requests" without a number is a dead end on a
 * checkout page.
 */
export type RequestEmailVerificationCodeResult =
  | { status: "sent"; resend_after_seconds: number; expires_in_seconds: number }
  | { status: "rate_limited"; reason: "cooldown" | "window"; retry_after_seconds: number }

type PreviousState = {
  code_hash: string | null
  expires_at: Date | null
  attempts: number
  last_sent_at: Date | null
  window_started_at: Date | null
  window_sent_count: number
}

/**
 * What the compensation restores: the row that was there before this send, or
 * nothing at all when the code was the first one for the address.
 */
type SendCompensation = {
  email: string
  existingId: string | null
  previous: PreviousState | null
} | null

const secondsUntil = (at: number, now: number) =>
  Math.max(1, Math.ceil((at - now) / 1000))

/**
 * Issues a code and mails it, replacing any code already outstanding for the
 * address.
 *
 * The send limits live on the row rather than only in memory so they survive a
 * restart and hold across processes: five an hour per address, with a minute
 * between two, which is enough for a customer whose mail is slow and far too
 * little to use the endpoint to flood an inbox.
 *
 * Sending is part of this step on purpose. If the provider refuses the message,
 * the step throws and its compensation puts the row back exactly as it was, so
 * the customer can retry immediately instead of being locked out of their own
 * checkout by a cooldown that bought them nothing.
 */
const sendEmailVerificationCodeStep = createStep(
  "send-email-verification-code",
  async (input: RequestEmailVerificationCodeInput, { container }) => {
    const email = normalizeEmail(input.email)
    const now = Date.now()
    const nowDate = new Date(now)

    const verificationService: EmailVerificationModuleService =
      container.resolve(EMAIL_VERIFICATION_MODULE)

    const [existing] = await verificationService.listEmailVerifications(
      { email },
      { take: 1 }
    )

    const windowActive =
      Boolean(existing?.window_started_at) &&
      new Date(existing!.window_started_at!).getTime() + SEND_WINDOW_MS > now
    const sentInWindow = windowActive ? existing!.window_sent_count : 0
    const lastSentAt = existing?.last_sent_at
      ? new Date(existing.last_sent_at).getTime()
      : 0

    if (existing && lastSentAt + RESEND_COOLDOWN_MS > now) {
      return new StepResponse<
        RequestEmailVerificationCodeResult,
        SendCompensation
      >(
        {
          status: "rate_limited",
          reason: "cooldown",
          retry_after_seconds: secondsUntil(
            lastSentAt + RESEND_COOLDOWN_MS,
            now
          ),
        },
        null
      )
    }

    if (
      existing &&
      windowActive &&
      sentInWindow >= MAX_SENDS_PER_WINDOW
    ) {
      return new StepResponse<
        RequestEmailVerificationCodeResult,
        SendCompensation
      >(
        {
          status: "rate_limited",
          reason: "window",
          retry_after_seconds: secondsUntil(
            new Date(existing.window_started_at!).getTime() + SEND_WINDOW_MS,
            now
          ),
        },
        null
      )
    }

    const previous: PreviousState | null = existing
      ? {
          code_hash: existing.code_hash ?? null,
          expires_at: existing.expires_at ?? null,
          attempts: existing.attempts ?? 0,
          last_sent_at: existing.last_sent_at ?? null,
          window_started_at: existing.window_started_at ?? null,
          window_sent_count: existing.window_sent_count ?? 0,
        }
      : null

    const code = generateCode()
    const fields = {
      code_hash: hashCode(email, code),
      expires_at: new Date(now + CODE_TTL_MS),
      attempts: 0,
      last_sent_at: nowDate,
      window_started_at: windowActive ? existing!.window_started_at! : nowDate,
      window_sent_count: sentInWindow + 1,
    }

    if (existing) {
      await verificationService.updateEmailVerifications({
        id: existing.id,
        ...fields,
      })
    } else {
      await verificationService.createEmailVerifications({ email, ...fields })
    }

    const notificationService = container.resolve(Modules.NOTIFICATION)

    await notificationService.createNotifications({
      to: email,
      channel: "email",
      template: EMAIL_TEMPLATES.EMAIL_VERIFICATION,
      data: {
        storeName: process.env.STORE_NAME || "DevCart",
        code,
        expiresInMinutes: Math.round(CODE_TTL_MS / 60_000),
      },
    })

    return new StepResponse<
      RequestEmailVerificationCodeResult,
      SendCompensation
    >(
      {
        status: "sent",
        resend_after_seconds: Math.round(RESEND_COOLDOWN_MS / 1000),
        expires_in_seconds: Math.round(CODE_TTL_MS / 1000),
      },
      { email, existingId: existing?.id ?? null, previous }
    )
  },
  async (compensation: SendCompensation | undefined, { container }) => {
    if (!compensation) {
      return
    }

    const verificationService: EmailVerificationModuleService =
      container.resolve(EMAIL_VERIFICATION_MODULE)

    if (compensation.existingId && compensation.previous) {
      await verificationService.updateEmailVerifications({
        id: compensation.existingId,
        ...compensation.previous,
      })
      return
    }

    const [created] = await verificationService.listEmailVerifications(
      { email: compensation.email },
      { take: 1 }
    )

    if (created) {
      await verificationService.deleteEmailVerifications([created.id])
    }
  }
)

/**
 * Sends a guest the six-digit code that proves they can read their address.
 *
 * Nothing about this address is revealed here: whether it already belongs to a
 * customer, whether it was verified before, whether the mail was delivered. The
 * answer is the same for every address, and only the inbox knows.
 */
export const requestEmailVerificationCodeWorkflow = createWorkflow(
  "request-email-verification-code",
  (input: RequestEmailVerificationCodeInput) => {
    const result = sendEmailVerificationCodeStep(input)

    return new WorkflowResponse(result)
  }
)
