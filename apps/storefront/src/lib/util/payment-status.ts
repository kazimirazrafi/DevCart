import type { PaymentIntentResult, StripeError } from "@stripe/stripe-js"

/*
 * What a payment attempt means, in one place. Three parties report on a payment:
 * Stripe.js in the browser, Medusa's server-side authorization, and the webhook.
 * This module turns each into the same small vocabulary. Only `settled` may lead
 * to an order.
 */

export type PaymentFailureKind =
  /** The payment was refused or could not be made. Retrying is safe. */
  | "payment_failed"
  /** The payment is with the bank. Do not charge again; check back. */
  | "payment_pending"
  /** The payment is not the problem; the order could not be built. */
  | "cart_problem"

export type PaymentFailure = { kind: PaymentFailureKind; message: string }

const NETWORK =
  "We could not reach the payment provider. Check your connection and try again."
const GENERIC =
  "The payment could not be completed. Check your card details and try again."
const DECLINED =
  "Your payment was not approved. Check the card details or use a different card."
const VERIFY =
  "Your bank needs one more verification step. Try again and complete it."
const PENDING =
  "Your payment is still being processed. Check again in a moment — do not pay again."
const CANCELLED = "The payment was cancelled. Try again."
const CART_PROBLEM =
  "The order could not be created, so the payment was cancelled. Check the cart and try again."

/**
 * Stripe's failure, translated into what the customer should do. The message is
 * written for developers, so the documented codes decide the copy.
 */
export const describeStripeError = (
  error: StripeError | null | undefined
): string => {
  if (!error) {
    return GENERIC
  }

  // Integration failures carry a type and no useful code, so read the type first.
  // Otherwise a dropped connection is reported as a card problem.
  switch (error.type) {
    case "api_connection_error":
      return NETWORK
    case "api_error":
      return "The payment provider had a problem. Try again in a moment."
    case "rate_limit_error":
      return "Too many attempts just now. Wait a moment and try again."
    case "authentication_error":
    case "invalid_request_error":
    case "idempotency_error":
      return "The payment could not be started. Try again in a moment."
  }

  switch (error.code) {
    case "expired_card":
    case "invalid_expiry_month":
    case "invalid_expiry_year":
      return "That card has expired. Use a card that has not expired."

    case "incorrect_number":
    case "invalid_number":
      return "The card number does not look right. Check it and try again."

    case "incorrect_cvc":
    case "invalid_cvc":
      return "The security code does not match. Check the digits on the card and try again."

    case "postal_code_invalid":
      return "The billing postcode does not match the card. Check it and try again."

    case "card_declined":
      switch (error.decline_code) {
        case "insufficient_funds":
          return "There is not enough credit on that card. Try another card."
        case "lost_card":
        case "stolen_card":
          return "That card cannot be used. Try another card."
        case "authentication_required":
          return VERIFY
        default:
          return "Your bank declined the payment. Try another card or contact your bank."
      }

    case "authentication_required":
      return VERIFY

    case "processing_error":
      return "The payment could not be processed just now. Try again in a moment."

    case "rate_limit":
      return "Too many attempts just now. Wait a moment and try again."

    default:
      // Card and validation errors are written for the payer, so keep Stripe's
      // sentence; anything else could leak an integration detail.
      return error.type === "card_error" || error.type === "validation_error"
        ? error.message || GENERIC
        : GENERIC
  }
}

export type StripeOutcome =
  /** Stripe has the money (or the authorization). The order may be created. */
  | { status: "settled" }
  /** The bank has it. No order yet; asking for a card again would double-charge. */
  | { status: "pending"; message: string }
  /** Nothing was taken. The customer can correct the details and retry. */
  | { status: "failed"; message: string }

/**
 * Reads the PaymentIntent rather than the error: a confirm that ends in an error
 * can still have succeeded, and that path must not ask the customer to pay again.
 */
export const readStripePaymentResult = ({
  error,
  paymentIntent,
}: PaymentIntentResult): StripeOutcome => {
  const intent = paymentIntent ?? error?.payment_intent

  if (
    intent &&
    (intent.status === "succeeded" || intent.status === "requires_capture")
  ) {
    return { status: "settled" }
  }

  if (error) {
    if (intent?.status === "processing") {
      return { status: "pending", message: PENDING }
    }

    return { status: "failed", message: describeStripeError(error) }
  }

  switch (intent?.status) {
    case "processing":
      return { status: "pending", message: PENDING }
    case "requires_action":
      return { status: "failed", message: VERIFY }
    case "canceled":
      return { status: "failed", message: CANCELLED }
    case "requires_confirmation":
      return { status: "failed", message: "The payment was not confirmed. Try again." }
    case "requires_payment_method":
      return { status: "failed", message: DECLINED }
    default:
      return {
        status: "failed",
        message: "The payment could not be confirmed. Try again.",
      }
  }
}

/**
 * Why completing the cart failed, read from the payment session: it is updated
 * from Stripe's own answer on the server, which the browser's result cannot be.
 */
export const describePlaceOrderFailure = ({
  errorType,
  errorMessage,
  sessionStatus,
}: {
  errorType?: string | null
  errorMessage?: string | null
  sessionStatus?: string | null
}): PaymentFailure => {
  if (/already completed/i.test(errorMessage ?? "")) {
    return {
      kind: "cart_problem",
      message:
        "This cart has already been checked out. If you placed the order, the confirmation is in your email.",
    }
  }

  // The contact step should prevent this, but a stale tab whose cookie expired
  // lands here; "the order could not be created" would send them to their card.
  if (/verify your email/i.test(errorMessage ?? "")) {
    return {
      kind: "cart_problem",
      message:
        "Confirm your email address before placing the order. We sent you a six-digit code.",
    }
  }

  if (/already being completed/i.test(errorMessage ?? "")) {
    return {
      kind: "payment_pending",
      message:
        "Your order is still being finalised. Check again in a moment — do not pay again.",
    }
  }

  if (errorType === "payment_authorization_error") {
    return { kind: "payment_failed", message: DECLINED }
  }

  if (errorType === "payment_requires_more_error") {
    return { kind: "payment_failed", message: VERIFY }
  }

  switch (sessionStatus) {
    case "error":
      return { kind: "payment_failed", message: DECLINED }
    case "requires_more":
      return { kind: "payment_failed", message: VERIFY }
    case "pending":
    case "pending_authorization":
      return { kind: "payment_pending", message: PENDING }
    case "canceled":
      return { kind: "payment_failed", message: CANCELLED }
    case "authorized":
    case "captured":
      // The money is fine; the order could not be built from the cart.
      return { kind: "cart_problem", message: CART_PROBLEM }
    default:
      return { kind: "cart_problem", message: CART_PROBLEM }
  }
}

/** Messages a redirect-based payment can return with, keyed by the URL code. */
export const PAYMENT_RETURN_MESSAGES: Record<string, string> = {
  declined: DECLINED,
  verification: VERIFY,
  pending: PENDING,
  order: CART_PROBLEM,
}

const RETURN_KINDS: Record<string, PaymentFailureKind> = {
  declined: "payment_failed",
  verification: "payment_failed",
  pending: "payment_pending",
  order: "cart_problem",
}

/** Reads the `payment_error` code the payment-return route redirects with. */
export const describePaymentReturn = (
  code: string | null | undefined
): PaymentFailure | null => {
  if (!code) {
    return null
  }

  const message = PAYMENT_RETURN_MESSAGES[code]

  return message ? { kind: RETURN_KINDS[code], message } : null
}
