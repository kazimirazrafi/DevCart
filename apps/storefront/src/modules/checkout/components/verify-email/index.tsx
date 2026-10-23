"use client"

import {
  confirmVerificationCode,
  resendVerificationCode,
} from "@lib/data/email-verification"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Button, Input, linkClass } from "@modules/design-system"
import { useParams } from "next/navigation"
import { useActionState, useEffect, useState } from "react"

import ErrorMessage from "../error-message"
import { SubmitButton } from "../submit-button"

/** Mirrors the backend's resend cooldown, so the button agrees with it. */
const RESEND_SECONDS = 60

/**
 * Step 1, second half: the code that proves the address is the customer's.
 *
 * The code is typed here rather than followed as a link so the customer never
 * leaves the checkout with a cart in a cookie and comes back to a page that no
 * longer knows what they were doing. It is a plain form with no cleverness: a
 * wrong code keeps everything they typed, and "resend" is a separate form so a
 * customer who mistypes the code cannot accidentally ask for another one.
 *
 * The countdown is an affordance, not the rule. The backend owns the cooldown
 * and the hourly limit, and its message is what the customer reads if this
 * browser's clock disagrees with it.
 */
const VerifyEmail = ({
  email,
  notice,
}: {
  email: string
  /** `sent` when a code was just mailed, `wait` when one already was. */
  notice?: "sent" | "wait"
}) => {
  const { countryCode } = useParams<{ countryCode: string }>()
  const [confirmState, confirmAction] = useActionState(
    confirmVerificationCode,
    null
  )
  const [resendState, resendAction, resending] = useActionState(
    resendVerificationCode,
    null
  )

  const [cooldown, setCooldown] = useState(
    notice === "sent" ? RESEND_SECONDS : 0
  )

  // A freshly mailed code restarts the wait, whatever this browser thought.
  useEffect(() => {
    if (resendState?.resent) {
      setCooldown(RESEND_SECONDS)
    }
  }, [resendState])

  useEffect(() => {
    if (cooldown <= 0) {
      return
    }

    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000)

    return () => clearTimeout(timer)
  }, [cooldown])

  return (
    <div className="flex max-w-prose flex-col gap-5" data-testid="verify-email">
      <p className="text-small text-ink/80">
        {notice === "wait"
          ? "We sent a code to this address a moment ago. It is still in your inbox"
          : "We emailed a six-digit code to"}{" "}
        <span className="break-all font-semibold text-ink">{email}</span>. Enter
        it below to continue.
      </p>

      <form action={confirmAction} className="flex flex-col gap-4">
        <div className="max-w-[220px]">
          <Input
            id="verification-code"
            name="code"
            label="Verification code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            autoFocus
            error={confirmState?.fields?.code}
            data-testid="verification-code-input"
          />
        </div>

        <input type="hidden" name="country_code" value={countryCode ?? ""} />

        <ErrorMessage
          error={confirmState?.message}
          data-testid="verification-error"
        />

        <div>
          <SubmitButton size="large" data-testid="verify-email-button">
            Verify email and continue
          </SubmitButton>
        </div>
      </form>

      <form action={resendAction} className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Button
            type="submit"
            variant="secondary"
            size="medium"
            disabled={cooldown > 0 || resending}
            loading={resending}
            data-testid="resend-code-button"
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : "Email me a new code"}
          </Button>

          <LocalizedClientLink
            href={`/${countryCode}/checkout?step=contact&change=1`}
            scroll={false}
            className={`${linkClass} text-small`}
            data-testid="change-email-link"
          >
            Use a different address
          </LocalizedClientLink>
        </div>

        {resendState?.message ? (
          <p
            role="status"
            className="text-small text-ink/80"
            data-testid="resend-code-status"
          >
            {resendState.message}
          </p>
        ) : null}
      </form>
    </div>
  )
}

export default VerifyEmail
