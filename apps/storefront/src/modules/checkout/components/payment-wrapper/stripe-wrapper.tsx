"use client"

import { Stripe, StripeElementsOptions } from "@stripe/stripe-js"
import { Elements } from "@stripe/react-stripe-js"
import { HttpTypes } from "@medusajs/types"
import { createContext } from "react"

type StripeWrapperProps = {
  paymentSession: HttpTypes.StorePaymentSession
  stripeKey?: string
  stripePromise: Promise<Stripe | null> | null
  children: React.ReactNode
}

export const StripeContext = createContext(false)

const StripeWrapper: React.FC<StripeWrapperProps> = ({
  paymentSession,
  stripeKey,
  stripePromise,
  children,
}) => {
  const options: StripeElementsOptions = {
    clientSecret: paymentSession!.data?.client_secret as string | undefined,
  }

  if (!stripeKey) {
    throw new Error(
      "Stripe key is missing. Set NEXT_PUBLIC_STRIPE_KEY environment variable."
    )
  }

  if (!stripePromise) {
    throw new Error(
      "Stripe promise is missing. Make sure you have provided a valid Stripe key."
    )
  }

  if (!paymentSession?.data?.client_secret) {
    throw new Error(
      "Stripe client secret is missing. Cannot initialize Stripe."
    )
  }

  return (
    <StripeContext.Provider value={true}>
      {/*
       * react-stripe-js deliberately ignores changes to `clientSecret`: it is
       * read once, when the Elements instance is created. A cart whose session
       * is replaced holds a new PaymentIntent with a new client secret, so
       * without this key the payment element would go on confirming the old,
       * canceled intent — the customer sees Stripe's bare "A processing error
       * occurred." Keying the instance on the secret is what makes a replaced
       * session mount a fresh element bound to the session the cart now holds.
       */}
      <Elements
        key={paymentSession.data?.client_secret as string | undefined}
        options={options}
        stripe={stripePromise}
      >
        {children}
      </Elements>
    </StripeContext.Provider>
  )
}

export default StripeWrapper
