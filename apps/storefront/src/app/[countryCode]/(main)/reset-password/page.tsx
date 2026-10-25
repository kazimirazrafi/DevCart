import { Metadata } from "next"

import ResetPassword from "@modules/account/components/reset-password"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Rule, linkClass } from "@modules/design-system"

export const metadata: Metadata = {
  title: "Reset password",
  description: "Choose a new password for your account.",
  // A link with a token in it has no business in a search index.
  robots: { index: false, follow: false },
}

/**
 * Outside /account on purpose: middleware redirects every /account/* URL to
 * sign-in, and the person opening a reset link is signed out. The middleware also
 * adds the country code, so the email carries one URL for every region.
 */
export default async function ResetPasswordPage(props: {
  searchParams: Promise<{ token?: string | string[] }>
}) {
  const token = (await props.searchParams).token
  const value = Array.isArray(token) ? token[0] : token

  return (
    <div className="content-container py-10 small:py-16">
      {value ? (
        <ResetPassword token={value} />
      ) : (
        <div
          className="flex w-full max-w-md flex-col gap-6"
          data-testid="reset-password-invalid"
        >
          <h1 className="font-display text-h2 font-bold text-ink">
            This link is incomplete
          </h1>
          <p className="max-w-prose text-body text-ink/80">
            The reset link is missing its token, which usually means the email
            client cut it in half. Ask for a new link and open it from the
            beginning.
          </p>
          <Rule />
          <div>
            <LocalizedClientLink
              href="/account"
              className={linkClass}
              data-testid="reset-password-request-new"
            >
              Request a new link
            </LocalizedClientLink>
          </div>
        </div>
      )}
    </div>
  )
}
