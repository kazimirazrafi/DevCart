import { CreditCard } from "@medusajs/icons"
import Bancontact from "@modules/common/icons/bancontact"
import Ideal from "@modules/common/icons/ideal"
import PayPal from "@modules/common/icons/paypal"
import React from "react"

/*
 * The payment options this store offers: card through Stripe, and cash on
 * delivery through Medusa's manual provider. The list is enforced in
 * `listCartPaymentMethods`, so a provider switched on for the region in the
 * backend still has to be added here before the checkout will show it —
 * otherwise a provider (or a duplicate card option) can appear in production
 * because of a backend change nobody reviewed.
 */
export const ENABLED_PAYMENT_PROVIDERS = [
  "pp_stripe_stripe",
  "pp_system_default",
] as const

/*
 * The card option sells cards, not whatever Stripe's dashboard happens to have
 * switched on. Without this the PaymentIntent is created with the account's
 * automatic payment methods, so the element can offer wallets and bank schemes
 * under a "Credit card" heading. The provider passes this object straight into
 * the PaymentIntent, so the element only lists what it names.
 */
export const CARD_SESSION_DATA = { payment_method_types: ["card"] } as const

/*
 * Titles and icons for every provider this storefront can render — including
 * ones no longer offered, because order receipts outlive the checkout and need
 * a name for the method a customer actually used.
 */
export const paymentInfoMap: Record<
  string,
  { title: string; icon: React.JSX.Element }
> = {
  pp_stripe_stripe: {
    title: "Credit card",
    icon: <CreditCard />,
  },
  "pp_medusa-payments_default": {
    title: "Credit card",
    icon: <CreditCard />,
  },
  "pp_stripe-ideal_stripe": {
    title: "iDeal",
    icon: <Ideal />,
  },
  "pp_stripe-bancontact_stripe": {
    title: "Bancontact",
    icon: <Bancontact />,
  },
  pp_paypal_paypal: {
    title: "PayPal",
    icon: <PayPal />,
  },
  pp_system_default: {
    title: "Cash on delivery",
    icon: <CreditCard />,
  },
  // Add more payment providers here
}

// This only checks if it is native stripe or medusa payments for card payments, it ignores the other stripe-based providers
export const isStripeLike = (providerId?: string) => {
  return (
    providerId?.startsWith("pp_stripe_") || providerId?.startsWith("pp_medusa-")
  )
}

export const isPaypal = (providerId?: string) => {
  return providerId?.startsWith("pp_paypal")
}
/*
 * Medusa's manual provider: nothing is charged online, the order is recorded as
 * awaiting payment and collected on delivery. It is this store's cash on
 * delivery option.
 */
export const isManual = (providerId?: string) => {
  return providerId?.startsWith("pp_system_default")
}

// Add currencies that don't need to be divided by 100
export const noDivisionCurrencies = [
  "krw",
  "jpy",
  "vnd",
  "clp",
  "pyg",
  "xaf",
  "xof",
  "bif",
  "djf",
  "gnf",
  "kmf",
  "mga",
  "rwf",
  "xpf",
  "htg",
  "vuv",
  "xag",
  "xdr",
  "xau",
]
