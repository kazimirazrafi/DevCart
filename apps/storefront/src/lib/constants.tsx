import { CreditCard } from "@medusajs/icons"
import Bancontact from "@modules/common/icons/bancontact"
import Ideal from "@modules/common/icons/ideal"
import PayPal from "@modules/common/icons/paypal"
import React from "react"

/*
 * Payment providers the checkout offers. A provider enabled in the backend
 * still has to be listed here before it can be paid with.
 */
export const ENABLED_PAYMENT_PROVIDERS = [
  "pp_stripe_stripe",
  "pp_system_default",
] as const

/* Restrict the Stripe element to cards instead of the account's defaults. */
export const CARD_SESSION_DATA = { payment_method_types: ["card"] } as const

/*
 * The publishable key Stripe.js loads with. Empty when the deployment has none,
 * which is the one failure the checkout has to name rather than wait on: the
 * card element cannot mount, so the payment step would otherwise show its
 * skeleton forever.
 */
export const stripePublishableKey =
  process.env.NEXT_PUBLIC_STRIPE_KEY ||
  process.env.NEXT_PUBLIC_MEDUSA_PAYMENTS_PUBLISHABLE_KEY ||
  ""

/* Titles and icons, kept for providers no longer offered: receipts outlive
 * the checkout. */
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
}

export const isStripeLike = (providerId?: string) => {
  return (
    providerId?.startsWith("pp_stripe_") || providerId?.startsWith("pp_medusa-")
  )
}

export const isPaypal = (providerId?: string) => {
  return providerId?.startsWith("pp_paypal")
}
/* Medusa's manual provider: nothing is charged online, payment is collected on delivery. */
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
