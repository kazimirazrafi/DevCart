"use client"

import { signInWithGoogle } from "@lib/data/google-auth"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import { useSearchParams } from "next/navigation"
import { useActionState } from "react"

/* Only a path on this site is followed after sign-in. */
const samePath = (value: string | null) =>
  value && value.startsWith("/") && !value.startsWith("//") ? value : null

/* Google's own colours, not the theme's: the mark identifies the provider. */
const GoogleMark = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 shrink-0">
    <path
      fill="#4285F4"
      d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.57 5.57 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82Z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24Z"
    />
    <path
      fill="#FBBC05"
      d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.29a11.99 11.99 0 0 0 0 10.76l3.98-3.09Z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.7 0 3.99 2.47 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
    />
  </svg>
)

/*
 * Rendered by both the sign-in and the create-account view: the backend
 * creates the customer on first use and matches them afterwards.
 */
const GoogleButton = () => {
  const [message, formAction] = useActionState(signInWithGoogle, null)
  const redirectTo = samePath(useSearchParams().get("redirect"))

  return (
    <div className="flex flex-col gap-3">
      <form action={formAction}>
        <input type="hidden" name="redirect" value={redirectTo ?? ""} />

        <SubmitButton
          variant="secondary"
          size="large"
          className="w-full"
          data-testid="google-sign-in-button"
        >
          <GoogleMark />
          Continue with Google
        </SubmitButton>
      </form>

      <ErrorMessage
        error={message?.state === "error" ? message.error : null}
        data-testid="google-error-message"
      />
    </div>
  )
}

export default GoogleButton
