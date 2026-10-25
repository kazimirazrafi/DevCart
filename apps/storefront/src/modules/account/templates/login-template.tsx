"use client"

import AuthArtwork from "@modules/account/components/auth-artwork"
import ErrorMessage from "@modules/checkout/components/error-message"
import ForgotPassword from "@modules/account/components/forgot-password"
import Login from "@modules/account/components/login"
import Register from "@modules/account/components/register"
import { useSearchParams } from "next/navigation"
import { useState } from "react"

export enum LOGIN_VIEW {
  SIGN_IN = "sign-in",
  REGISTER = "register",
  FORGOT_PASSWORD = "forgot-password",
}

/* The Google callback route redirects, so failures arrive as ?auth_error=. */
const AUTH_ERRORS: Record<string, string> = {
  google_cancelled: "Google sign-in was cancelled. Nothing was changed.",
  google_email_taken:
    "An account already uses that Google address. Sign in with your password instead.",
  google_failed: "Google sign-in could not be completed. Try again.",
}

/*
 * One page with a view switch, so a protected page's ?redirect= survives
 * signing in, registering or resetting a password.
 */
const LoginTemplate = () => {
  const [currentView, setCurrentView] = useState<LOGIN_VIEW>(LOGIN_VIEW.SIGN_IN)
  const searchParams = useSearchParams()
  const authError = AUTH_ERRORS[searchParams.get("auth_error") ?? ""]
  // The reset page signs nobody in, so the confirmation is shown here.
  const resetDone = searchParams.get("reset") === "success"

  return (
    <div className="grid w-full grid-cols-1 items-stretch gap-10 small:grid-cols-12 small:gap-14">
      <div className="flex w-full flex-col gap-8 small:col-span-7">
        {resetDone && currentView === LOGIN_VIEW.SIGN_IN && (
          <p
            className="border border-ink p-4 text-small text-ink"
            data-testid="password-reset-success"
          >
            Your password was changed. Sign in with the new one.
          </p>
        )}

        {authError && (
          <ErrorMessage error={authError} data-testid="auth-error-message" />
        )}

        {currentView === LOGIN_VIEW.SIGN_IN && (
          <Login setCurrentView={setCurrentView} />
        )}
        {currentView === LOGIN_VIEW.REGISTER && (
          <Register setCurrentView={setCurrentView} />
        )}
        {currentView === LOGIN_VIEW.FORGOT_PASSWORD && (
          <ForgotPassword setCurrentView={setCurrentView} />
        )}
      </div>

      <AuthArtwork />
    </div>
  )
}

export default LoginTemplate
