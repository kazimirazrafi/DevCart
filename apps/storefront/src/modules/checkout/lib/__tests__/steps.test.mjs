// A guest's contact step is only complete once the address is verified.
import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  firstIncompleteStep,
  isStepComplete,
  isStepReachable,
  resolveCheckoutStep,
} from "../steps.ts"

const GUEST = { signedIn: false, emailVerified: false }
const VERIFIED_GUEST = { signedIn: false, emailVerified: true }
const SIGNED_IN = { signedIn: true, emailVerified: false }

const cart = (overrides = {}) => ({
  email: "ada@example.com",
  shipping_address: { address_1: "1 Analytical Way" },
  billing_address: { address_1: "1 Analytical Way" },
  shipping_methods: [{ id: "sm_1" }],
  payment_collection: { payment_sessions: [{ id: "ps_1" }] },
  ...overrides,
})

describe("isStepComplete", () => {
  it("does not call a guest's contact step done on the email alone", () => {
    assert.equal(isStepComplete(cart(), "contact", GUEST), false)
  })

  it("calls it done once the address is verified", () => {
    assert.equal(isStepComplete(cart(), "contact", VERIFIED_GUEST), true)
  })

  it("does not ask a signed-in customer to verify their own address", () => {
    assert.equal(isStepComplete(cart(), "contact", SIGNED_IN), true)
  })

  it("still needs an email even when signed in", () => {
    assert.equal(isStepComplete(cart({ email: null }), "contact", SIGNED_IN), false)
  })

  it("never calls review complete: it collects nothing", () => {
    assert.equal(isStepComplete(cart(), "review", VERIFIED_GUEST), false)
  })
})

describe("resolveCheckoutStep", () => {
  it("keeps an unverified guest on contact, whatever step they asked for", () => {
    assert.equal(resolveCheckoutStep(cart(), "address", GUEST), "contact")
    assert.equal(resolveCheckoutStep(cart(), "review", GUEST), "contact")
  })

  it("lets a verified guest onto the address step", () => {
    assert.equal(resolveCheckoutStep(cart(), "address", VERIFIED_GUEST), "address")
  })

  it("falls back to the first unfinished step when the URL names none", () => {
    assert.equal(firstIncompleteStep(cart(), VERIFIED_GUEST), "review")
    assert.equal(firstIncompleteStep(cart(), GUEST), "contact")
  })

  it("ignores a step whose prerequisites are missing", () => {
    const noShipping = cart({ shipping_methods: [] })

    assert.equal(resolveCheckoutStep(noShipping, "review", VERIFIED_GUEST), "delivery")
  })

  it("ignores a step that is not a checkout step at all", () => {
    assert.equal(resolveCheckoutStep(cart(), "payment/../admin", SIGNED_IN), "review")
  })
})

describe("isStepReachable", () => {
  it("does not let an unverified guest reach the address form", () => {
    assert.equal(isStepReachable(cart(), "address", GUEST), false)
    assert.equal(isStepReachable(cart(), "contact", GUEST), true)
  })

  it("lets a verified guest walk back to contact", () => {
    assert.equal(isStepReachable(cart(), "contact", VERIFIED_GUEST), true)
  })
})
