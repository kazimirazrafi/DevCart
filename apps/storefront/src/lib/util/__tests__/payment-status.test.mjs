/* Payment messaging, tested without a browser or a Stripe account: each case is a
 * shape Stripe.js and the Store API return, asserted on what the customer is told.
 * Node strips the types, so there is no build step and no test framework. */
import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  describePaymentReturn,
  describePlaceOrderFailure,
  describeStripeError,
  readStripePaymentResult,
} from "../payment-status.ts"

const intent = (status) => ({ status })

describe("readStripePaymentResult", () => {
  it("treats a declined card as failed and never as pending", () => {
    const outcome = readStripePaymentResult({
      paymentIntent: null,
      error: {
        type: "card_error",
        code: "card_declined",
        decline_code: "generic_decline",
        message: "Your card was declined.",
      },
    })

    assert.equal(outcome.status, "failed")
    assert.match(outcome.message, /bank declined/i)
  })

  it("does not call a payment settled while it still needs authentication", () => {
    const outcome = readStripePaymentResult({
      paymentIntent: intent("requires_action"),
      error: null,
    })

    assert.equal(outcome.status, "failed")
    assert.match(outcome.message, /verification/i)
  })

  it("reports a processing payment as pending so it is not paid twice", () => {
    const outcome = readStripePaymentResult({
      paymentIntent: intent("processing"),
      error: null,
    })

    assert.equal(outcome.status, "pending")
    assert.match(outcome.message, /do not pay again/i)
  })

  it("accepts an authorized payment as settled", () => {
    assert.deepEqual(
      readStripePaymentResult({
        paymentIntent: intent("requires_capture"),
        error: null,
      }),
      { status: "settled" }
    )
  })

  it("accepts a succeeded intent even when Stripe also returned an error", () => {
    // The bank redirected and the response was lost: the money moved, so the
    // order may be created.
    assert.deepEqual(
      readStripePaymentResult({
        paymentIntent: null,
        error: { type: "api_error", payment_intent: intent("succeeded") },
      }),
      { status: "settled" }
    )
  })

  it("lets the customer retry after a payment that was never confirmed", () => {
    const outcome = readStripePaymentResult({
      paymentIntent: intent("requires_payment_method"),
      error: null,
    })

    assert.equal(outcome.status, "failed")
    assert.match(outcome.message, /not approved|try again/i)
  })
})

describe("describeStripeError", () => {
  it("names an expired card instead of echoing Stripe's developer text", () => {
    assert.match(
      describeStripeError({ type: "card_error", code: "expired_card" }),
      /expired/i
    )
  })

  it("points at the security code when the CVC is wrong", () => {
    assert.match(
      describeStripeError({ type: "card_error", code: "incorrect_cvc" }),
      /security code/i
    )
  })

  it("tells the customer there are no funds rather than to retry the same card", () => {
    assert.match(
      describeStripeError({
        type: "card_error",
        code: "card_declined",
        decline_code: "insufficient_funds",
      }),
      /not enough credit/i
    )
  })

  it("calls a lost connection a connection problem", () => {
    assert.match(
      describeStripeError({ type: "api_connection_error" }),
      /connection/i
    )
  })

  it("falls back to a generic sentence for an unknown error", () => {
    assert.match(describeStripeError({ type: "api_error" }), /try again in a moment/i)
    assert.match(describeStripeError(null), /check your card details/i)
  })
})

describe("describePlaceOrderFailure", () => {
  it("treats an errored session as a retryable decline", () => {
    assert.equal(
      describePlaceOrderFailure({ sessionStatus: "error" }).kind,
      "payment_failed"
    )
  })

  it("treats a payment the bank is still clearing as pending, not failed", () => {
    assert.equal(
      describePlaceOrderFailure({ sessionStatus: "pending_authorization" })
        .kind,
      "payment_pending"
    )
  })

  it("does not ask for payment again when the payment was authorized", () => {
    const failure = describePlaceOrderFailure({ sessionStatus: "authorized" })

    assert.equal(failure.kind, "cart_problem")
    assert.doesNotMatch(failure.message, /pay again/i)
  })

  it("reads a cart another request is completing as pending work", () => {
    assert.equal(
      describePlaceOrderFailure({
        errorMessage: "Cart is already being completed",
      }).kind,
      "payment_pending"
    )
  })

  it("reads an already-completed cart as a finished checkout", () => {
    const failure = describePlaceOrderFailure({
      errorMessage: "Cart is already completed",
    })

    assert.equal(failure.kind, "cart_problem")
    assert.match(failure.message, /already been checked out/i)
  })

  it("sends an unverified guest back to their inbox, not to their card", () => {
    const failure = describePlaceOrderFailure({
      errorMessage:
        "Verify your email address before placing the order. We sent you a six-digit code.",
    })

    assert.equal(failure.kind, "cart_problem")
    assert.match(failure.message, /confirm your email/i)
    assert.match(failure.message, /six-digit code/i)
    assert.doesNotMatch(failure.message, /card/i)
  })

  it("reads a 3-D Secure requirement as retryable verification", () => {
    const failure = describePlaceOrderFailure({
      errorType: "payment_requires_more_error",
    })

    assert.equal(failure.kind, "payment_failed")
    assert.match(failure.message, /verification/i)
  })

  it("reads an authorization refusal as a decline", () => {
    assert.equal(
      describePlaceOrderFailure({ errorType: "payment_authorization_error" })
        .kind,
      "payment_failed"
    )
  })

  it("still gives an actionable sentence when nothing is known", () => {
    const failure = describePlaceOrderFailure({})

    assert.equal(failure.kind, "cart_problem")
    assert.ok(failure.message.length > 0)
  })
})

describe("describePaymentReturn", () => {
  it("round-trips every code the payment-return route writes", () => {
    assert.equal(describePaymentReturn("declined").kind, "payment_failed")
    assert.equal(describePaymentReturn("verification").kind, "payment_failed")
    assert.equal(describePaymentReturn("pending").kind, "payment_pending")
    assert.equal(describePaymentReturn("order").kind, "cart_problem")
  })

  it("ignores an absent or unknown code", () => {
    assert.equal(describePaymentReturn(null), null)
    assert.equal(describePaymentReturn(undefined), null)
    assert.equal(describePaymentReturn("nonsense"), null)
  })
})
