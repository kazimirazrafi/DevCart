import { Metadata } from "next"
import { Suspense } from "react"

import VerifyAccount from "@modules/account/components/verify-account"

export const metadata: Metadata = {
  title: "Verify your email",
  description: "Verify your email address to complete your registration.",
  // The page consumes a one-time token, so it is never indexed.
  robots: { index: false, follow: false },
}

export default function VerifyAccountPage() {
  return (
    <Suspense
      fallback={
        // `VerifyAccount` brings its own container, so the fallback does too
        // rather than wrapping both in a second one.
        <div className="content-container py-10 small:py-16">
          <p
            className="max-w-prose text-body text-ink/80"
            data-testid="verify-account-loading"
          >
            Verifying your email…
          </p>
        </div>
      }
    >
      <VerifyAccount />
    </Suspense>
  )
}
