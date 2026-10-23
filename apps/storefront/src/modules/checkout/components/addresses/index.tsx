"use client"

import { setAddresses } from "@lib/data/cart"
import useToggleState from "@lib/hooks/use-toggle-state"
import compareAddresses from "@lib/util/compare-addresses"
import { HttpTypes } from "@medusajs/types"
import { useActionState, useEffect, useRef } from "react"

import BillingAddress from "../billing_address"
import ErrorMessage from "../error-message"
import ShippingAddress from "../shipping-address"
import StepSection from "../step-section"
import { SubmitButton } from "../submit-button"

/**
 * Step 2: where the order goes, and who pays for it. The address itself is
 * validated on the server — the browser only catches the empty required fields,
 * so anything that gets past it comes back keyed by field name.
 */
const Addresses = ({
  cart,
  customer,
  isOpen,
}: {
  cart: HttpTypes.StoreCart
  customer: HttpTypes.StoreCustomer | null
  isOpen: boolean
}) => {
  const { state: sameAsBilling, toggle: toggleSameAsBilling } = useToggleState(
    cart.shipping_address && cart.billing_address
      ? compareAddresses(cart.shipping_address, cart.billing_address)
      : true
  )

  const [state, formAction] = useActionState(setAddresses, null)
  const errors = state?.fields ?? {}
  const billingToggle = useRef<HTMLInputElement>(null)

  /*
   * React resets a form once its action returns, and a checkbox goes back to
   * the state it was mounted with rather than to what the customer chose.
   * Measured: after a rejected address the box came back checked, so the next
   * submit silently replaced a separate billing address with the shipping one.
   * `state` is a dependency on purpose — that is when the reset lands.
   */
  useEffect(() => {
    const input = billingToggle.current

    if (input && input.checked !== sameAsBilling) {
      input.checked = sameAsBilling
    }
  }, [sameAsBilling, state])

  const address = cart.shipping_address
  const complete = Boolean(address?.address_1 && cart.billing_address?.address_1)

  return (
    <StepSection
      id="address"
      number={2}
      title="Address"
      isOpen={isOpen}
      complete={complete}
    >
      {isOpen ? (
        <form action={formAction} className="flex flex-col gap-6">
          <ShippingAddress customer={customer} cart={cart} errors={errors} />

          <label className="flex items-start gap-2 text-small">
            <input
              ref={billingToggle}
              type="checkbox"
              name="same_as_billing"
              checked={sameAsBilling}
              onChange={toggleSameAsBilling}
              className="mt-0.5 h-4 w-4 shrink-0 accent-riso-blue"
              data-testid="billing-address-checkbox"
            />
            <span className="font-semibold text-ink">
              Billing address same as shipping address
            </span>
          </label>

          {!sameAsBilling && (
            <div className="flex flex-col gap-4">
              <h3 className="font-display text-lead font-semibold">
                Billing address
              </h3>
              <BillingAddress cart={cart} errors={errors} />
            </div>
          )}

          <ErrorMessage
            error={state?.message}
            data-testid="address-error-message"
          />

          <div>
            <SubmitButton size="large" data-testid="submit-address-button">
              Continue to delivery
            </SubmitButton>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 gap-6 xsmall:grid-cols-3">
          <div
            className="flex flex-col gap-1"
            data-testid="shipping-address-summary"
          >
            <h3 className="text-small font-semibold text-ink">
              Shipping address
            </h3>
            <p className="text-small text-ink/80">
              <span className="block">
                {address?.first_name} {address?.last_name}
              </span>
              <span className="block">
                {address?.address_1} {address?.address_2}
              </span>
              <span className="block">
                {address?.postal_code}, {address?.city}
              </span>
              <span className="block">{address?.country_code?.toUpperCase()}</span>
            </p>
          </div>

          <div
            className="flex flex-col gap-1"
            data-testid="shipping-contact-summary"
          >
            <h3 className="text-small font-semibold text-ink">Contact</h3>
            <p className="text-small text-ink/80">
              <span className="block">{cart.email}</span>
              <span className="block">{address?.phone}</span>
            </p>
          </div>

          <div
            className="flex flex-col gap-1"
            data-testid="billing-address-summary"
          >
            <h3 className="text-small font-semibold text-ink">Billing address</h3>
            {sameAsBilling ? (
              <p className="text-small text-ink/80">
                Same as the shipping address.
              </p>
            ) : (
              <p className="text-small text-ink/80">
                <span className="block">
                  {cart.billing_address?.first_name}{" "}
                  {cart.billing_address?.last_name}
                </span>
                <span className="block">
                  {cart.billing_address?.address_1}{" "}
                  {cart.billing_address?.address_2}
                </span>
                <span className="block">
                  {cart.billing_address?.postal_code},{" "}
                  {cart.billing_address?.city}
                </span>
                <span className="block">
                  {cart.billing_address?.country_code?.toUpperCase()}
                </span>
              </p>
            )}
          </div>
        </div>
      )}
    </StepSection>
  )
}

export default Addresses
