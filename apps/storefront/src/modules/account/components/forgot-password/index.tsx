"use client"

import { requestPasswordReset } from "@lib/data/password-reset"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import { Input, Rule, linkClass } from "@modules/design-system"
import { useActionState, useState } from "react"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

/* The answer never reveals whether an address has an account. */
const ForgotPassword = ({ setCurrentView }: Props) => {
  const [message, formAction] = useActionState(requestPasswordReset, null)

  // Controlled: a rejected submission must not wipe the address to correct.
  const [email, setEmail] = useState("")

  if (message?.state === "success") {
    return (
      <div
        className="flex w-full max-w-md flex-col gap-6"
        data-testid="forgot-password-sent"
      >
        <header className="flex flex-col gap-2">
          <h1 className="font-display text-h2 font-bold text-ink">
            Check your inbox
          </h1>
          <p className="max-w-prose text-body text-ink/80">
            If <span className="font-semibold text-ink">{message.email}</span>{" "}
            belongs to an account, a reset link is on its way. It works once and
            expires in 15 minutes.
          </p>
        </header>

        <Rule />

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <button
            type="button"
            onClick={() => setCurrentView(LOGIN_VIEW.SIGN_IN)}
            className={linkClass}
            data-testid="forgot-password-back"
          >
            Back to sign in
          </button>
          <button
            type="button"
            onClick={() => setCurrentView(LOGIN_VIEW.FORGOT_PASSWORD)}
            className="text-small text-ink/70 underline decoration-1 underline-offset-4 hover:text-ink"
          >
            Use a different email
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex w-full max-w-md flex-col gap-8"
      data-testid="forgot-password-page"
    >
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-h2 font-bold text-ink">
          Reset your password
        </h1>
        <p className="max-w-prose text-body text-ink/80">
          Enter the email address on your account and we will send a link to set
          a new password.
        </p>
      </header>

      <form className="flex flex-col gap-5" action={formAction}>
        <Input
          id="forgot-password-email"
          name="email"
          type="email"
          label="Email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          data-testid="email-input"
        />

        <ErrorMessage
          error={message?.state === "error" ? message.error : null}
          data-testid="forgot-password-error"
        />

        <SubmitButton
          size="large"
          className="w-full"
          data-testid="send-reset-link-button"
        >
          Send reset link
        </SubmitButton>
      </form>

      <Rule />

      <p className="text-body text-ink/80">
        Remembered it?{" "}
        <button
          type="button"
          onClick={() => setCurrentView(LOGIN_VIEW.SIGN_IN)}
          className={linkClass}
          data-testid="forgot-password-back"
        >
          Sign in
        </button>
      </p>
    </div>
  )
}

export default ForgotPassword
