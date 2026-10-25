import { Radio } from "@headlessui/react"
import { isManual, stripePublishableKey } from "@lib/constants"
import clsx from "clsx"
import { PaymentElement } from "@stripe/react-stripe-js"
import React, { useContext, type JSX } from "react"

import SkeletonCardDetails from "@modules/skeletons/components/skeleton-card-details"

import { StripeContext } from "../payment-wrapper/stripe-wrapper"

type PaymentContainerProps = {
  paymentProviderId: string
  selectedPaymentOptionId: string | null
  disabled?: boolean
  paymentInfoMap: Record<string, { title: string; icon: JSX.Element }>
  children?: React.ReactNode
}

const PaymentContainer: React.FC<PaymentContainerProps> = ({
  paymentProviderId,
  selectedPaymentOptionId,
  paymentInfoMap,
  disabled = false,
  children,
}) => {
  const selected = selectedPaymentOptionId === paymentProviderId

  return (
    <Radio
      key={paymentProviderId}
      value={paymentProviderId}
      disabled={disabled}
      data-testid="payment-option-radio"
      className={clsx(
        "flex w-full flex-col gap-3 border px-5 py-4 text-small",
        selected ? "border-ink" : "border-ink/30",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-ink"
      )}
    >
      <span className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className={clsx(
              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
              selected ? "border-ink" : "border-ink/40"
            )}
          >
            {selected && (
              <span className="h-2.5 w-2.5 rounded-full bg-riso-blue" />
            )}
          </span>
          {paymentInfoMap[paymentProviderId]?.title || paymentProviderId}
        </span>
        <span>{paymentInfoMap[paymentProviderId]?.icon}</span>
      </span>

      {isManual(paymentProviderId) && (
        <span className="text-small text-ink/80">
          Pay the courier when your order arrives. Nothing is charged now.
        </span>
      )}

      {children}
    </Radio>
  )
}

export default PaymentContainer

export const StripePaymentContainer = ({
  paymentProviderId,
  selectedPaymentOptionId,
  paymentInfoMap,
  disabled = false,
  setError,
  setPaymentComplete,
}: Omit<PaymentContainerProps, "children"> & {
  setError: (error: string | null) => void
  setPaymentComplete: (complete: boolean) => void
}) => {
  const stripeReady = useContext(StripeContext)

  return (
    <PaymentContainer
      paymentProviderId={paymentProviderId}
      selectedPaymentOptionId={selectedPaymentOptionId}
      paymentInfoMap={paymentInfoMap}
      disabled={disabled}
    >
      {selectedPaymentOptionId === paymentProviderId &&
        (stripeReady ? (
          <div className="flex flex-col gap-2 py-2">
            <span className="font-semibold text-ink">
              Enter your payment details
            </span>
            <PaymentElement
              options={{ layout: "accordion" }}
              onChange={(e) => {
                setError(null)
                setPaymentComplete(e.complete)
              }}
              // Without this handler Stripe.js reports a failed mount as an
              // unhandled load error and the option renders blank.
              onLoadError={(e) => {
                setPaymentComplete(false)
                setError(
                  e.error?.message ?? "Could not load the payment methods."
                )
              }}
            />
          </div>
        ) : stripePublishableKey ? (
          <SkeletonCardDetails />
        ) : (
          // No key means the element can never mount, so the skeleton would
          // never resolve. Say so instead of loading forever.
          <span className="text-small text-ink/80" data-testid="stripe-not-configured">
            Card payments are unavailable right now. Choose another payment
            method, or contact us and we will take the order another way.
          </span>
        ))}
    </PaymentContainer>
  )
}
