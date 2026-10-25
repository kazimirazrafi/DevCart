import { isManual, paymentInfoMap } from "@lib/constants"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"

export type PaymentState =
  | "received"
  | "pending"
  | "on_delivery"
  | "refunded"
  | "unpaid"

export type PaymentSummary = {
  state: PaymentState
  headline: string
  detail: string
}

const last4Of = (order: HttpTypes.StoreOrder) => {
  const payment = order.payment_collections?.[0]?.payments?.[0]
  const data = payment?.data as
    | {
        card_last4?: string
        payment_method?: { card?: { last4?: string } }
      }
    | null
    | undefined

  return data?.card_last4 ?? data?.payment_method?.card?.last4
}

const providerOf = (order: HttpTypes.StoreOrder) => {
  const collection = order.payment_collections?.[0]

  return (
    collection?.payments?.[0]?.provider_id ??
    collection?.payment_sessions?.[0]?.provider_id
  )
}

const methodTitle = (order: HttpTypes.StoreOrder) => {
  const provider = providerOf(order)

  return provider ? (paymentInfoMap[provider]?.title ?? provider) : null
}

export const paymentSummary = (
  order: HttpTypes.StoreOrder
): PaymentSummary => {
  const amount = convertToLocale({
    amount: order.total ?? 0,
    currency_code: order.currency_code,
  })

  // Refunds and cancellations win over the method-specific copy below.
  switch (order.payment_status) {
    case "refunded":
      return {
        state: "refunded",
        headline: `Payment of ${amount} refunded`,
        detail: "The full amount went back to your original payment method.",
      }

    case "partially_refunded":
      return {
        state: "refunded",
        headline: "Part of your payment was refunded",
        detail: "The refund went back to your original payment method.",
      }

    case "canceled":
      return {
        state: "unpaid",
        headline: "Payment was cancelled",
        detail: "Nothing was charged for this order.",
      }
  }

  if (isManual(providerOf(order))) {
    if (
      order.payment_status === "captured" ||
      order.payment_status === "partially_captured"
    ) {
      return {
        state: "received",
        headline: `Payment of ${amount} received`,
        detail: "Collected in cash on delivery.",
      }
    }

    return {
      state: "on_delivery",
      headline: `Pay ${amount} on delivery`,
      detail:
        "Nothing was charged online. You pay the courier when your order arrives.",
    }
  }

  switch (order.payment_status) {
    case "captured":
    case "partially_captured": {
      const last4 = last4Of(order)

      return {
        state: "received",
        headline: `Payment of ${amount} received`,
        detail: last4
          ? `Charged to the card ending in ${last4}.`
          : `Paid with ${methodTitle(order) ?? "your payment method"}.`,
      }
    }

    case "authorized":
    case "partially_authorized":
      return {
        state: "pending",
        headline: `Payment of ${amount} authorised`,
        detail:
          "Your bank has approved it. The amount is taken when the order is fulfilled.",
      }

    case "awaiting":
      return {
        state: "pending",
        headline: `Payment of ${amount} is being processed`,
        detail:
          "The bank has not confirmed it yet. You have not been charged twice — do not pay again.",
      }

    case "requires_action":
      return {
        state: "pending",
        headline: `Payment of ${amount} needs one more step`,
        detail:
          "Your bank has not confirmed the payment. Open the order to finish the verification.",
      }

    default:
      return {
        state: "unpaid",
        headline: "No payment has been taken",
        detail: "Nothing has been charged for this order yet.",
      }
  }
}
