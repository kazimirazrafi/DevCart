import { isManual, paymentInfoMap } from "@lib/constants"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"

/*
 * What the order says about the money, in one place.
 *
 * The receipt used to describe the payment method and nothing else, so after
 * paying there was no sentence anywhere on the site that said the card had been
 * charged. The order's own `payment_status` is the authority — it is written by
 * the payment module, not by the browser — and cash on delivery is the one case
 * where nothing was ever going to be taken.
 */

export type PaymentState =
  /** The money was taken. */
  | "received"
  /** Approved or still clearing; not taken, and must not read as taken. */
  | "pending"
  /** Cash on delivery: nothing online, paid to the courier. */
  | "on_delivery"
  /** Money went back to the customer. */
  | "refunded"
  /** Nothing was taken and nothing is expected online. */
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

  /*
   * A refund or a cancellation is the truth about the money whatever the
   * method was, so those are read before the method-specific copy below.
   */
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
    /*
     * Cash on delivery is collected when the order arrives and captured in the
     * admin afterwards, so the same order can read "pay on delivery" before
     * that and "received" after it.
     */
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
