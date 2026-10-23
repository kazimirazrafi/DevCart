"use client"

import { login } from "@lib/data/customer"
import { getStoreName } from "@lib/util/env"
import GoogleButton from "@modules/account/components/google-button"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import { Input, Rule, linkClass } from "@modules/design-system"
import { useRouter, useSearchParams } from "next/navigation"
import { useActionState, useEffect, useState } from "react"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

/**
 * The `redirect` a protected page left behind. Only a path on this site is
 * followed: a search parameter is attacker-controlled, and an unchecked one
 * turns the sign-in form into an open redirect.
 */
const samePath = (value: string | null) =>
  value && value.startsWith("/") && !value.startsWith("//") ? value : null

const Login = ({ setCurrentView }: Props) => {
  const [message, formAction] = useActionState(login, null)
  const router = useRouter()
  const redirectTo = samePath(useSearchParams().get("redirect"))

  /*
   * Controlled on purpose. React resets an uncontrolled field once a form
   * action returns (measured in K2), so a rejected sign-in would wipe the
   * address the customer has to correct along with the password they mistyped.
   */
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  /*
   * The action sets the auth cookie, but the page around it was rendered for a
   * signed-out customer; asking for it again is what swaps the sign-in form for
   * the account. A `?redirect=` is followed by the action itself, which is the
   * only place a navigation and this refresh can be ordered correctly.
   */
  useEffect(() => {
    if (message?.state === "success") {
      router.refresh()
    }
  }, [message, router])

  return (
    <div
      className="flex w-full max-w-md flex-col gap-8"
      data-testid="login-page"
    >
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-h2 font-bold text-ink">Sign in</h1>
        <p className="max-w-prose text-body text-ink/80">
          Orders, saved addresses and any cart you started come with you.
        </p>
      </header>

      {message?.state === "verification_required" && (
        <p
          className="border border-ink p-4 text-small text-ink"
          data-testid="login-verification-message"
        >
          We sent a verification link to <strong>{message.email}</strong>. Open
          it, then sign in.
        </p>
      )}

      {message?.state === "exists" && (
        <div className="flex flex-col gap-3 border border-ink p-4">
          <p className="text-small text-ink" data-testid="login-exists-message">
            This email already has an account, but this password is not linked
            to it. If you signed up with Google, continue with Google. Otherwise
            reset the password to link it to this address.
          </p>
          <button
            type="button"
            onClick={() => setCurrentView(LOGIN_VIEW.FORGOT_PASSWORD)}
            className={linkClass}
            data-testid="login-reset-password-link"
          >
            Reset the password
          </button>
        </div>
      )}

      <div className="flex flex-col gap-6">
        <GoogleButton />
        <Rule />
      </div>

      <form className="flex flex-col gap-5" action={formAction}>
        {/* The action needs it to return the customer to the page they came from. */}
        <input type="hidden" name="redirect" value={redirectTo ?? ""} />

        <Input
          id="login-email"
          name="email"
          type="email"
          label="Email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          data-testid="email-input"
        />
        <Input
          id="login-password"
          name="password"
          type="password"
          label="Password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          data-testid="password-input"
        />

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setCurrentView(LOGIN_VIEW.FORGOT_PASSWORD)}
            className="text-small text-ink/70 underline decoration-1 underline-offset-4 hover:text-ink"
            data-testid="forgot-password-link"
          >
            Forgot your password?
          </button>
        </div>

        <ErrorMessage
          error={message?.state === "error" ? message.error : null}
          data-testid="login-error-message"
        />

        <div>
          <SubmitButton
            size="large"
            className="w-full"
            data-testid="sign-in-button"
          >
            Sign in
          </SubmitButton>
        </div>
      </form>

      <Rule />

      <p className="text-body text-ink/80">
        New to {getStoreName()}?{" "}
        <button
          type="button"
          onClick={() => setCurrentView(LOGIN_VIEW.REGISTER)}
          className={linkClass}
          data-testid="register-button"
        >
          Create an account
        </button>
      </p>
    </div>
  )
}

export default Login
