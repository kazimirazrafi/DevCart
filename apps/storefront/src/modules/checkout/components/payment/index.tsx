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

/**
 * Step 4: how it is paid for. Choosing a card provider opens a payment session
 * straight away, because Stripe needs the session's client secret to mount the
 * payment element; the other providers are sessioned when the customer
 * continues.
 */
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
  /*
   * The pending sessions, and the one that belongs to the provider being paid
   * with. A manual session created earlier in the same checkout must not stand
   * in for the card one in the checks below: the card session is the only one
   * with a client secret, and reading the manual one as "the" session is what
   * made every visit to this step open a second card session on top of the one
   * the payment element was already mounted for.
   */
  const pendingSessions = (
    cart.payment_collection?.payment_sessions ?? []
  ).filter((paymentSession) => paymentSession.status === "pending")

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentComplete, setPaymentComplete] = useState(false)
  /*
   * Open on the session already on the cart, or on the first provider the
   * region offers. Preselecting is not the same as paying: a card session is
   * only created when the customer continues, and the button still refuses to
   * advance until the payment element is complete.
   */
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(
    // A card session is the one with a payment element mounted, so it is the
    // one worth reopening on — the same choice `PaymentWrapper` makes.
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

  /*
   * A Stripe-like provider cannot be paid until its session exists: the payment
   * element mounts from the session's client secret.
   */
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

    /*
     * Creating a session for a provider that already has one replaces it, and
     * the replaced session's PaymentIntent is canceled with it. The payment
     * element mounted from that intent would then be confirming a canceled
     * intent, which Stripe answers with a bare "A processing error occurred."
     * So a session is only created when this provider has none pending: coming
     * back to the card option mid-checkout keeps the session, the intent and
     * whatever the customer had already typed.
     */
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
        // Only the card intent is narrowed; the manual provider takes no data.
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

  /*
   * The region's first provider is preselected, so a Stripe-like one that the
   * customer never had to click would never get its session — the step would
   * sit on a placeholder with Continue disabled and no way forward. It is
   * created as the step opens instead.
   *
   * `autoInitiated` is what stops a failed attempt from re-running on every
   * render the session call causes; closing the step clears it, so reopening
   * tries again.
   */
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

      {/*
       * The step's form is hidden rather than unmounted once the step is closed.
       * Stripe confirms the payment from the element the customer typed into
       * ("elements should have a mounted Payment Element"), and Place order
       * lives on Review — exactly where this step is collapsed. Unmounting it
       * there made every card payment fail, and fail silently.
       */}
      <div className={isOpen ? "flex flex-col gap-6" : "hidden"}>
        {/*
         * Why they are back here at all. Above the fields, because it is the
         * first thing they need to know before deciding to type a card in
         * again — and for a pending payment it is the reason not to.
         */}
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

          {/*
           * "Continue" moving the customer forward used to look like the moment
           * of payment. It is not: card details are only charged from the
           * review step's Place order button. Saying so here is what makes that
           * button's wording, and the receipt that follows, unambiguous.
           */}
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
