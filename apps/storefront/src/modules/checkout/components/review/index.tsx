"use client"

import { paymentInfoMap } from "@lib/constants"
import { convertToLocale } from "@lib/util/money"
import type { PaymentFailure } from "@lib/util/payment-status"
import { HttpTypes } from "@medusajs/types"

import PaymentButton from "../payment-button"
import PaymentReturnNotice from "../payment-return-notice"
import StepSection from "../step-section"

const Review = ({
  cart,
  isOpen,
  returnedFailure,
}: {
  cart: HttpTypes.StoreCart
  isOpen: boolean
  returnedFailure?: PaymentFailure | null
}) => {
  const address = cart.shipping_address
  const method = cart.shipping_methods?.at(-1)
  const session = cart.payment_collection?.payment_sessions?.find(
    (paymentSession) => paymentSession.status === "pending"
  )

  const rows: { label: string; value: string; testId: string }[] = [
    { label: "Email", value: cart.email ?? "—", testId: "review-email" },
    {
      label: "Ship to",
      value: address
        ? `${address.first_name} ${address.last_name}, ${address.address_1}, ${address.postal_code} ${address.city}, ${address.country_code?.toUpperCase()}`
        : "—",
      testId: "review-address",
    },
    {
      label: "Delivery",
      value: method
        ? `${method.name} — ${convertToLocale({
            amount: method.amount ?? 0,
            currency_code: cart.currency_code,
          })}`
        : "—",
      testId: "review-delivery",
    },
    {
      label: "Payment",
      value: paymentInfoMap[session?.provider_id ?? ""]?.title ??
        session?.provider_id ??
        "—",
      testId: "review-payment",
    },
  ]

  return (
    <StepSection
      id="review"
      number={5}
      title="Review"
      isOpen={isOpen}
      complete={false}
    >
      {isOpen && (
        <div className="flex flex-col gap-6">
          <dl className="grid grid-cols-1 gap-4 border border-ink p-5 small:grid-cols-2">
            {rows.map((row) => (
              <div key={row.testId} className="flex flex-col gap-1">
                <dt className="text-small font-semibold text-ink">
                  {row.label}
                </dt>
                <dd className="text-small text-ink/80" data-testid={row.testId}>
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>

          <p className="max-w-prose text-small text-ink/80">
            Placing the order confirms that you have read and accept our terms
            of sale and returns policy.
          </p>

          <PaymentReturnNotice failure={returnedFailure} />

          <PaymentButton
            cart={cart}
            returnedFailure={returnedFailure}
            data-testid="submit-order-button"
          />
        </div>
      )}
    </StepSection>
  )
}

export default Review
