"use client"

import { resetPassword } from "@lib/data/password-reset"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import { Input, Rule, buttonClass, linkClass } from "@modules/design-system"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useActionState, useState } from "react"

type Props = {
  token: string
}

/* The emailed token is carried in the URL, works once and expires in 15 minutes. */
const ResetPassword = ({ token }: Props) => {
  const [message, formAction] = useActionState(resetPassword, null)

  /* Controlled so the fields survive a rejected submit. */
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")

  if (message?.state === "success") {
    return (
      <div
        className="flex w-full max-w-md flex-col gap-6"
        data-testid="reset-password-success"
      >
        <h1 className="font-display text-h2 font-bold text-ink">
          Password updated
        </h1>
        <p className="max-w-prose text-body text-ink/80">
          Your new password is ready. Sign in with it and your orders and
          addresses will be where you left them.
        </p>
        <Rule />
        <div>
          <LocalizedClientLink
            href="/account"
            className={buttonClass({ size: "large" })}
            data-testid="reset-password-sign-in"
          >
            Sign in
          </LocalizedClientLink>
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex w-full max-w-md flex-col gap-8"
      data-testid="reset-password-page"
    >
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-h2 font-bold text-ink">
          Choose a new password
        </h1>
        <p className="max-w-prose text-body text-ink/80">
          It must be at least 8 characters. This link works once; after that,
          sign in with the new password.
        </p>
      </header>

      <form className="flex flex-col gap-5" action={formAction}>
        <input type="hidden" name="token" value={token} />

        <Input
          id="reset-password-password"
          name="password"
          type="password"
          label="New password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={
            message?.state === "error" && message.field === "password"
              ? message.error
              : undefined
          }
          data-testid="password-input"
        />
        <Input
          id="reset-password-confirm"
          name="confirm_password"
          type="password"
          label="Confirm new password"
          autoComplete="new-password"
          required
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          error={
            message?.state === "error" && message.field === "confirm_password"
              ? message.error
              : undefined
          }
          data-testid="confirm-password-input"
        />

        <ErrorMessage
          error={message?.state === "error" ? message.error : null}
          data-testid="reset-password-error"
        />

        <SubmitButton
          size="large"
          className="w-full"
          data-testid="reset-password-button"
        >
          Set new password
        </SubmitButton>
      </form>

      <Rule />

      <p className="text-body text-ink/80">
        Link expired?{" "}
        <LocalizedClientLink
          href="/account"
          className={linkClass}
          data-testid="reset-password-request-new"
        >
          Ask for a new one
        </LocalizedClientLink>
      </p>
    </div>
  )
}

export default ResetPassword
