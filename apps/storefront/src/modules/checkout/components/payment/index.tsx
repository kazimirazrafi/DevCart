"use client"

import { RadioGroup } from "@headlessui/react"
import {
  CARD_SESSION_DATA,
  isManual,
  isStripeLike,
  paymentInfoMap,
} from "@lib/constants"
import { initiatePaymentSession } from "@lib/data/cart"
import type { PaymentFailure } from "@lib/util/payment-status"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Button, linkClass } from "@modules/design-system"
import { usePathname, useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

import ErrorMessage from "../error-message"
import PaymentContainer, {
  StripePaymentContainer,
} from "../payment-container"
import PaymentReturnNotice from "../payment-return-notice"
import StepSection from "../step-section"

type CartWithGiftCards = HttpTypes.StoreCart & { gift_cards?: unknown[] }

const Payment = ({
  cart,
  availablePaymentMethods,
  isOpen,
  returnedFailure,
}: {
  cart: HttpTypes.StoreCart
  availablePaymentMethods: { id: string }[]
  isOpen: boolean
  returnedFailure?: PaymentFailure | null
}) => {
  const pendingSessions = (
    cart.payment_collection?.payment_sessions ?? []
  ).filter((paymentSession) => paymentSession.status === "pending")

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentComplete, setPaymentComplete] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(
    pendingSessions.find((paymentSession) =>
      isStripeLike(paymentSession.provider_id)
    )?.provider_id ??
      pendingSessions[0]?.provider_id ??
      availablePaymentMethods?.[0]?.id ??
      ""
  )

  const activeSession =
    pendingSessions.find(
      (paymentSession) => paymentSession.provider_id === selectedPaymentMethod
    ) ?? pendingSessions[0]

  const router = useRouter()
  const pathname = usePathname()

  const startStripeSession = useCallback(
    async (method: string) => {
      const result = await initiatePaymentSession(cart, {
        provider_id: method,
        data: CARD_SESSION_DATA,
      })

      if (!result.ok) {
        setError(result.message)
      }
    },
    [cart]
  )

  const setPaymentMethod = async (method: string) => {
    setError(null)
    setSelectedPaymentMethod(method)

    // A new session cancels the old PaymentIntent, so reuse a pending one.
    const hasPendingSession = pendingSessions.some(
      (paymentSession) => paymentSession.provider_id === method
    )

    if (isStripeLike(method) && !hasPendingSession) {
      await startStripeSession(method)
    }
  }

  const giftCards = (cart as CartWithGiftCards).gift_cards
  const paidByGiftcard = Boolean(giftCards?.length && cart.total === 0)

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(window.location.search)
      params.set(name, value)

      return params.toString()
    },
    []
  )

  const handleSubmit = async () => {
    setError(null)
    setIsLoading(true)

    const shouldInputPaymentDetails =
      isStripeLike(selectedPaymentMethod) && !activeSession

    const checkActiveSession =
      activeSession?.provider_id === selectedPaymentMethod

    if (!checkActiveSession) {
      const result = await initiatePaymentSession(cart, {
        provider_id: selectedPaymentMethod,
        ...(isStripeLike(selectedPaymentMethod)
          ? { data: CARD_SESSION_DATA }
          : {}),
      })

      if (!result.ok) {
        setError(result.message)
        setIsLoading(false)
        return
      }
    }

    setIsLoading(false)

    if (!shouldInputPaymentDetails) {
      router.push(pathname + "?" + createQueryString("step", "review"), {
        scroll: false,
      })
    }
  }

  useEffect(() => {
    setError(null)
  }, [isOpen])

  // The preselected provider still needs its session; autoInitiated stops a
  // failed attempt from re-running on every render.
  const [autoInitiated, setAutoInitiated] = useState<string | null>(null)
  const stripeSessionReady =
    activeSession?.provider_id === selectedPaymentMethod

  useEffect(() => {
    if (!isOpen) {
      setAutoInitiated(null)
      return
    }

    if (!isStripeLike(selectedPaymentMethod) || stripeSessionReady) {
      return
    }

    if (autoInitiated === selectedPaymentMethod) {
      return
    }

    setAutoInitiated(selectedPaymentMethod)
    void startStripeSession(selectedPaymentMethod)
  }, [
    isOpen,
    selectedPaymentMethod,
    stripeSessionReady,
    autoInitiated,
    startStripeSession,
  ])

  return (
    <StepSection
      id="payment"
      number={4}
      title="Payment"
      isOpen={isOpen}
      complete={Boolean(activeSession) || paidByGiftcard}
    >
      {!isOpen && (
        <div className="flex flex-col gap-1" data-testid="payment-summary">
          <h3 className="text-small font-semibold text-ink">Method</h3>
          <p className="text-small text-ink/80">
            {paymentInfoMap[selectedPaymentMethod]?.title ||
              activeSession?.provider_id ||
              selectedPaymentMethod}
          </p>
        </div>
      )}

      {/* Hidden, not unmounted: Stripe confirms from the mounted element. */}
      <div className={isOpen ? "flex flex-col gap-6" : "hidden"}>
        <PaymentReturnNotice failure={returnedFailure} />

        {paidByGiftcard ? (
          <div className="flex flex-col gap-1">
            <h3 className="text-small font-semibold text-ink">
              Payment method
            </h3>
            <p className="text-small text-ink/80" data-testid="payment-method-summary">
              Gift card
            </p>
          </div>
        ) : (
          availablePaymentMethods?.length && (
            <RadioGroup
              value={selectedPaymentMethod}
              onChange={(value: string) => setPaymentMethod(value)}
              aria-label="Payment method"
            >
              {availablePaymentMethods.map((paymentMethod) => (
                <div key={paymentMethod.id}>
                  {isStripeLike(paymentMethod.id) ? (
                    <StripePaymentContainer
                      paymentProviderId={paymentMethod.id}
                      selectedPaymentOptionId={selectedPaymentMethod}
                      paymentInfoMap={paymentInfoMap}
                      setError={setError}
                      setPaymentComplete={setPaymentComplete}
                    />
                  ) : (
                    <PaymentContainer
                      paymentInfoMap={paymentInfoMap}
                      paymentProviderId={paymentMethod.id}
                      selectedPaymentOptionId={selectedPaymentMethod}
                    />
                  )}
                </div>
              ))}
            </RadioGroup>
          )
        )}

        <ErrorMessage error={error} data-testid="payment-method-error-message" />

        <div className="flex flex-col gap-2">
          <Button
            size="large"
            onClick={handleSubmit}
            loading={isLoading}
            disabled={
              (isStripeLike(selectedPaymentMethod) && !paymentComplete) ||
              (!selectedPaymentMethod && !paidByGiftcard)
            }
            data-testid="submit-payment-button"
          >
            {!activeSession && isStripeLike(selectedPaymentMethod)
              ? "Enter payment details"
              : "Continue to review"}
          </Button>

          <p className="text-small text-ink/75" data-testid="payment-step-note">
            {isManual(selectedPaymentMethod)
              ? "Nothing is charged now. You pay the courier when your order arrives."
              : "Your card is not charged yet. It is charged when you place the order on the review step."}
          </p>
        </div>
      </div>

      {isOpen && (
        <p className="mt-4 text-small text-ink/75">
          Need to change the delivery?{" "}
          <LocalizedClientLink
            href="/checkout?step=delivery"
            scroll={false}
            className={linkClass}
          >
            Go back to delivery
          </LocalizedClientLink>
          .
        </p>
      )}
    </StepSection>
  )
}

export default Payment
