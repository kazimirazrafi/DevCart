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

/**
 * Step 1: who the order is for. Kept separate from the address so a guest is
 * identified before anything else is asked of them, and so the cart holds an
 * email from the start.
 *
 * A signed-in customer already told us this address, so the field arrives
 * filled in — the step still has to be confirmed, because the cart is what the
 * order is built from and the customer may be buying for someone else.
 */
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
  /** `sent` or `wait` after a code request; absent on a fresh visit. */
  verificationNotice?: "sent" | "wait"
  /** The customer asked to replace the address a code was sent to. */
  changingEmail?: boolean
}) => {
  const { countryCode } = useParams<{ countryCode: string }>()
  const [state, formAction] = useActionState(setCartEmail, null)

  /*
   * A signed-in customer's address is their account's, so there is nothing to
   * prove; a guest's is proved by the token the code form sets.
   */
  const verified = Boolean(cart.email) && (access.signedIn || access.emailVerified)

  /*
   * A rejected code request leaves the cart with an address but no code in the
   * inbox, so the form stays open with the reason rather than being replaced by
   * a code box for a message that never arrived.
   */
  const awaitingCode =
    Boolean(cart.email) && !verified && !changingEmail && !state?.message

  /*
   * Controlled on purpose. React resets an uncontrolled field after a form
   * action runs, so a rejected address would be wiped out of the input the
   * customer has to correct.
   */
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

          {/* The action needs it to build a country-aware redirect. */}
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
