"use client"

import { setCartEmail } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Input, linkClass } from "@modules/design-system"
import type { CheckoutAccess } from "@modules/checkout/lib/steps"
import { useParams } from "next/navigation"
import { useActionState, useState } from "react"

import ErrorMessage from "../error-message"
import StepSection from "../step-section"
import { SubmitButton } from "../submit-button"
import VerifyEmail from "../verify-email"

const Contact = ({
  cart,
  customer,
  isOpen,
  access,
  verificationNotice,
  changingEmail,
}: {
  cart: HttpTypes.StoreCart
  customer: HttpTypes.StoreCustomer | null
  isOpen: boolean
  access: CheckoutAccess
  verificationNotice?: "sent" | "wait"
  changingEmail?: boolean
}) => {
  const { countryCode } = useParams<{ countryCode: string }>()
  const [state, formAction] = useActionState(setCartEmail, null)

  const verified = Boolean(cart.email) && (access.signedIn || access.emailVerified)

  const awaitingCode =
    Boolean(cart.email) && !verified && !changingEmail && !state?.message

  // Controlled: React resets an uncontrolled field after a form action.
  const [email, setEmail] = useState(cart.email || customer?.email || "")

  return (
    <StepSection
      id="contact"
      number={1}
      title="Contact"
      isOpen={isOpen}
      complete={verified}
    >
      {isOpen && awaitingCode ? (
        <VerifyEmail email={cart.email!} notice={verificationNotice} />
      ) : isOpen ? (
        <form action={formAction} className="flex flex-col gap-5">
          <p className="max-w-prose text-small text-ink/75">
            We send the order confirmation and any delivery updates here.
          </p>

          {customer ? (
            <p className="text-small text-ink/80" data-testid="contact-signed-in">
              Signed in as{" "}
              <span className="font-semibold">{customer.email}</span>.
            </p>
          ) : (
            <p className="text-small text-ink/80">
              Have an account?{" "}
              <LocalizedClientLink
                href="/account"
                className={linkClass}
                data-testid="checkout-signin-link"
              >
                Sign in
              </LocalizedClientLink>{" "}
              to use your saved addresses.
            </p>
          )}

          <div className="max-w-sm">
            <Input
              id="contact-email"
              name="email"
              type="email"
              label="Email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              error={state?.fields?.email}
              data-testid="contact-email-input"
            />
          </div>

          <input type="hidden" name="country_code" value={countryCode ?? ""} />

          <ErrorMessage
            error={state?.message}
            data-testid="contact-error-message"
          />

          <div>
            <SubmitButton size="large" data-testid="submit-contact-button">
              {access.signedIn ? "Continue to address" : "Send verification code"}
            </SubmitButton>
          </div>
        </form>
      ) : (
        <p className="text-small text-ink" data-testid="contact-summary">
          {cart.email}
        </p>
      )}
    </StepSection>
  )
}

export default Contact
