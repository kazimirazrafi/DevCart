"use client"

import { signup } from "@lib/data/customer"
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

/* Only a path on this site is followed after sign-in. */
const samePath = (value: string | null) =>
  value && value.startsWith("/") && !value.startsWith("//") ? value : null

const Register = ({ setCurrentView }: Props) => {
  const [message, formAction] = useActionState(signup, null)
  const router = useRouter()
  const redirectTo = samePath(useSearchParams().get("redirect"))

  /* Controlled so a rejected signup keeps the values that were typed. */
  const [values, setValues] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
  })

  const setValue = (name: keyof typeof values) => (value: string) =>
    setValues((current) => ({ ...current, [name]: value }))

  /* Signing up signs the customer in, so refetch the page to show the account. */
  useEffect(() => {
    if (message?.state === "success") {
      router.refresh()
    }
  }, [message, router])

  return (
    <div
      className="flex w-full max-w-md flex-col gap-8"
      data-testid="register-page"
    >
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-h2 font-bold text-ink">
          Create an account
        </h1>
        <p className="max-w-prose text-body text-ink/80">
          Track your orders, save addresses, and keep your cart across devices.
        </p>
      </header>

      {message?.state === "verification_required" && (
        <p
          className="border border-ink p-4 text-small text-ink"
          data-testid="register-verification-message"
        >
          We sent a verification link to <strong>{message.email}</strong>. Open
          it to finish setting up your account.
        </p>
      )}

      {message?.state === "exists" && (
        <div className="flex flex-col gap-3 border border-ink p-4">
          <p className="text-small text-ink" data-testid="register-exists-message">
            An account already uses <strong>{message.email}</strong>. Sign in
            instead — with Google, or with its password.
          </p>
          <button
            type="button"
            onClick={() => setCurrentView(LOGIN_VIEW.SIGN_IN)}
            className={linkClass}
            data-testid="register-sign-in-link"
          >
            Sign in
          </button>
        </div>
      )}

      <div className="flex flex-col gap-6">
        <GoogleButton />
        <Rule />
      </div>

      <form className="flex flex-col gap-5" action={formAction}>
        <input type="hidden" name="redirect" value={redirectTo ?? ""} />

        <div className="grid grid-cols-1 gap-5 small:grid-cols-2">
          <Input
            id="register-first-name"
            name="first_name"
            label="First name"
            autoComplete="given-name"
            required
            value={values.first_name}
            onChange={(event) => setValue("first_name")(event.target.value)}
            data-testid="first-name-input"
          />
          <Input
            id="register-last-name"
            name="last_name"
            label="Last name"
            autoComplete="family-name"
            required
            value={values.last_name}
            onChange={(event) => setValue("last_name")(event.target.value)}
            data-testid="last-name-input"
          />
        </div>

        <Input
          id="register-email"
          name="email"
          type="email"
          label="Email"
          autoComplete="email"
          required
          value={values.email}
          onChange={(event) => setValue("email")(event.target.value)}
          data-testid="email-input"
        />
        <Input
          id="register-phone"
          name="phone"
          type="tel"
          label="Phone"
          autoComplete="tel"
          value={values.phone}
          onChange={(event) => setValue("phone")(event.target.value)}
          data-testid="phone-input"
        />
        <Input
          id="register-password"
          name="password"
          type="password"
          label="Password"
          autoComplete="new-password"
          required
          value={values.password}
          onChange={(event) => setValue("password")(event.target.value)}
          data-testid="password-input"
        />

        <ErrorMessage
          error={message?.state === "error" ? message.error : null}
          data-testid="register-error"
        />

        <div>
          {/* Distinct from the sign-in page's create-account switch. */}
          <SubmitButton
            size="large"
            className="w-full"
            data-testid="create-account-button"
          >
            Create account
          </SubmitButton>
        </div>
      </form>

      <Rule />

      <p className="text-body text-ink/80">
        Already have an account?{" "}
        <button
          type="button"
          onClick={() => setCurrentView(LOGIN_VIEW.SIGN_IN)}
          className={linkClass}
          data-testid="sign-in-link"
        >
          Sign in
        </button>
        .
      </p>
    </div>
  )
}

export default Register
