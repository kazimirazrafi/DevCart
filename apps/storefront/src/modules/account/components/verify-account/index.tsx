"use client"

import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"

import { confirmEmailVerification } from "@lib/data/customer"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Rule, buttonClass } from "@modules/design-system"

type VerificationState = "verifying" | "success" | "error"

const VerifyAccount = () => {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const [state, setState] = useState<VerificationState>("verifying")
  // Single-use token: guard against Strict Mode running the effect twice.
  const confirmed = useRef(false)

  useEffect(() => {
    if (confirmed.current) {
      return
    }
    confirmed.current = true

    if (!token) {
      setState("error")
      return
    }

    confirmEmailVerification(token).then(({ success }) =>
      setState(success ? "success" : "error")
    )
  }, [token])

  return (
    <div className="content-container py-10 small:py-16">
      <div
        className="flex w-full max-w-md flex-col gap-6"
        data-testid="verify-account-page"
      >
        <h1 className="font-display text-h2 font-bold text-ink">
          Email verification
        </h1>

        {state === "verifying" && (
          <p className="text-body text-ink/80">Verifying your email…</p>
        )}

        {state === "success" && (
          <p className="text-body text-ink/80">
            Your email is verified. Sign in to see your account.
          </p>
        )}

        {state === "error" && (
          <p className="border-l-2 border-riso-pink pl-3 text-small text-ink">
            This verification link is invalid or has expired. Sign in to be sent
            a new one.
          </p>
        )}

        <Rule />

        {/* A link styled as a button: nesting controls is invalid markup. */}
        <div>
          <LocalizedClientLink
            href="/account"
            className={buttonClass({
              variant: state === "success" ? "primary" : "secondary",
              size: "large",
            })}
            data-testid="verify-account-link"
          >
            {state === "success" ? "Go to sign in" : "Back to sign in"}
          </LocalizedClientLink>
        </div>
      </div>
    </div>
  )
}

export default VerifyAccount
