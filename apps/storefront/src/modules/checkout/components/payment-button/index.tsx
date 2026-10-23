"use client"

import { isManual, isStripeLike } from "@lib/constants"
import { placeOrder } from "@lib/data/cart"
import { convertToLocale } from "@lib/util/money"
import {
  readStripePaymentResult,
  type PaymentFailure,
} from "@lib/util/payment-status"
import { HttpTypes } from "@medusajs/types"
import { Button } from "@modules/design-system"
import { useElements, useStripe } from "@stripe/react-stripe-js"
import type { PaymentIntentResult } from "@stripe/stripe-js"
import { useParams } from "next/navigation"
import React, { useRef, useState } from "react"
import ErrorMessage from "../error-message"

type PaymentButtonProps = {
  cart: HttpTypes.StoreCart
  /** Why the customer came back from a redirect-based payment, if they did. */
  returnedFailure?: PaymentFailure | null
  "data-testid": string
}

const PaymentButton: React.FC<PaymentButtonProps> = ({
  cart,
  returnedFailure,
  "data-testid": dataTestId,
}) => {
  const notReady =
    !cart ||
    !cart.shipping_address ||
    !cart.billing_address ||
    !cart.email ||
    (cart.shipping_methods?.length ?? 0) < 1

  const paymentSession = cart.payment_collection?.payment_sessions?.[0]

  switch (true) {
    case isStripeLike(paymentSession?.provider_id):
      return (
        <StripePaymentButton
          notReady={notReady}
          cart={cart}
          returnedFailure={returnedFailure}
          data-testid={dataTestId}
        />
      )
    case isManual(paymentSession?.provider_id):
      return (
        <ManualTestPaymentButton
          cart={cart}
          notReady={notReady}
          data-testid={dataTestId}
        />
      )
    default:
      return <Button disabled>Select a payment method</Button>
  }
}

/**
 * What the button is doing, said in words as well as in the spinner. `pending`
 * is its own state because it is the one case where retrying is the wrong
 * action: the bank has the payment and asking for a card again could charge
 * twice.
 */
type Phase = "idle" | "confirming" | "placing" | "pending"

const labelOf = (phase: Phase, payLabel: string) => {
  switch (phase) {
    case "confirming":
      return "Confirming payment…"
    case "placing":
      return "Placing order…"
    case "pending":
      return "Check payment status"
    default:
      return payLabel
  }
}

const totalOf = (cart: HttpTypes.StoreCart) =>
  convertToLocale({
    amount: cart.total ?? 0,
    currency_code: cart.currency_code,
  })

const StripePaymentButton = ({
  cart,
  notReady,
  returnedFailure,
  "data-testid": dataTestId,
}: {
  cart: HttpTypes.StoreCart
  notReady: boolean
  returnedFailure?: PaymentFailure | null
  "data-testid"?: string
}) => {
  const [phase, setPhase] = useState<Phase>(
    returnedFailure?.kind === "payment_pending" ? "pending" : "idle"
  )
  const [failure, setFailure] = useState<PaymentFailure | null>(null)

  /*
   * A ref, not the state below: `disabled` only applies on the next render, so
   * a double click can land two submissions in the same tick. Stripe refuses a
   * second confirmation of the same intent, and Medusa locks the cart while it
   * completes, but two cart completions from one click still race for that
   * lock and one of them shows the customer a misleading failure.
   */
  const submitting = useRef(false)

  const stripe = useStripe()
  const elements = useElements()
  const { countryCode } = useParams()

  /*
   * The button names the amount because this is the click that takes it. A
   * button that says "Place order" while charging a card leaves the customer
   * guessing whether the money moved.
   */
  const payLabel = `Pay ${totalOf(cart)} and place order`

  const submitOrder = async () => {
    setPhase("placing")

    const result = await placeOrder()

    /*
     * A placed order redirects out of `placeOrder`, so reaching here means no
     * order exists. Keep the button usable unless the payment is genuinely
     * mid-flight, in which case the next press must check rather than pay.
     */
    if (!result.ok) {
      submitting.current = false
      setPhase(result.kind === "payment_pending" ? "pending" : "idle")
      setFailure(result)
    }
  }

  const handlePayment = async () => {
    if (submitting.current || !stripe || !elements || !cart) {
      return
    }

    submitting.current = true
    setFailure(null)
    setPhase("confirming")

    let result: PaymentIntentResult

    try {
      result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/api/payment-return?cart_id=${cart.id}&country_code=${countryCode}`,
          payment_method_data: {
            billing_details: {
              name:
                cart.billing_address?.first_name +
                " " +
                cart.billing_address?.last_name,
              address: {
                city: cart.billing_address?.city ?? undefined,
                country: cart.billing_address?.country_code ?? undefined,
                line1: cart.billing_address?.address_1 ?? undefined,
                line2: cart.billing_address?.address_2 ?? undefined,
                postal_code: cart.billing_address?.postal_code ?? undefined,
                state: cart.billing_address?.province ?? undefined,
              },
              email: cart.email ?? undefined,
              phone: cart.billing_address?.phone ?? undefined,
            },
          },
        },
        /*
         * Leave the site only when the selected method actually requires it, so
         * card payments still complete inline. A card that needs 3-D Secure
         * shows Stripe's modal here; if the bank redirects instead, the return
         * page finishes the order server-side.
         */
        redirect: "if_required",
      })
    } catch (cause) {
      /*
       * A declined card is *returned* by Stripe, not thrown, so it is handled
       * below with Stripe's own code. What lands here is a failure of the
       * integration itself — the payment element is not mounted, the key does
       * not match, the network dropped mid-call. It used to escape as an
       * unhandled rejection: the button sat spinning, nothing was said and
       * there was no way to retry.
       */
      console.error("Stripe confirmPayment failed", cause)
      submitting.current = false
      setPhase("idle")
      setFailure({
        kind: "payment_failed",
        message:
          "We could not reach the payment provider. Check your connection and try again.",
      })
      return
    }

    const outcome = readStripePaymentResult(result)

    if (outcome.status === "settled") {
      // Stripe has the money; only the server may now create the order.
      await submitOrder()
      return
    }

    submitting.current = false
    setPhase(outcome.status === "pending" ? "pending" : "idle")
    setFailure({
      kind: outcome.status === "pending" ? "payment_pending" : "payment_failed",
      message: outcome.message,
    })
  }

  const handleCheck = async () => {
    if (submitting.current) {
      return
    }

    submitting.current = true
    setFailure(null)
    await submitOrder()
  }

  return (
    <>
      <Button
        disabled={notReady}
        onClick={phase === "pending" ? handleCheck : handlePayment}
        size="large"
        loading={phase === "confirming" || phase === "placing"}
        data-testid={dataTestId}
      >
        {labelOf(phase, payLabel)}
      </Button>

      {failure?.kind === "payment_pending" ? (
        <p
          role="status"
          className="max-w-prose text-small text-ink"
          data-testid="stripe-payment-pending-message"
        >
          {failure.message}
        </p>
      ) : (
        <ErrorMessage
          error={failure?.message ?? null}
          data-testid="stripe-payment-error-message"
        />
      )}
    </>
  )
}

const ManualTestPaymentButton = ({
  cart,
  notReady,
  "data-testid": dataTestId,
}: {
  cart: HttpTypes.StoreCart
  notReady: boolean
  "data-testid"?: string
}) => {
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const inFlight = useRef(false)

  const handlePayment = async () => {
    if (inFlight.current) {
      return
    }

    inFlight.current = true
    setSubmitting(true)
    setErrorMessage(null)

    const result = await placeOrder()

    if (!result.ok) {
      inFlight.current = false
      setSubmitting(false)
      setErrorMessage(result.message)
    }
  }

  return (
    <>
      <Button
        disabled={notReady}
        loading={submitting}
        onClick={handlePayment}
        size="large"
        data-testid={dataTestId}
      >
        {submitting ? "Placing order…" : "Place order"}
      </Button>

      {/* Cash on delivery takes no money here, and the receipt that follows
          says the same thing, so the two cannot disagree. */}
      <p className="max-w-prose text-small text-ink/75">
        You pay {totalOf(cart)} to the courier when your order arrives.
      </p>

      <ErrorMessage
        error={errorMessage}
        data-testid="manual-payment-error-message"
      />
    </>
  )
}

export default PaymentButton
