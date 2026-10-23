import type { HttpTypes } from "@medusajs/types"

/**
 * The checkout is a fixed sequence, and the URL's `?step=` names the one the
 * customer is on. What each step collects lives on the cart, so completion is
 * read from the cart rather than tracked separately — that is what lets someone
 * go back, change a step and keep everything they entered after it.
 */
export type CheckoutStepId =
  | "contact"
  | "address"
  | "delivery"
  | "payment"
  | "review"

export type CheckoutStep = {
  id: CheckoutStepId
  label: string
}

export const CHECKOUT_STEPS: CheckoutStep[] = [
  { id: "contact", label: "Contact" },
  { id: "address", label: "Address" },
  { id: "delivery", label: "Delivery" },
  { id: "payment", label: "Payment" },
  { id: "review", label: "Review" },
]

const STEP_IDS = CHECKOUT_STEPS.map((step) => step.id)

/**
 * What the cart cannot say about the person checking out.
 *
 * A guest must prove they read the address the order goes to; a signed-in
 * customer does not, because the address is already their account's. Neither
 * fact belongs on the cart — one is a backend-signed token in a cookie, the
 * other is a session — so the page passes them in and these pure functions read
 * them alongside the cart.
 *
 * `emailVerified` is a display fact only. The backend re-checks the token when
 * the cart is completed, which is what makes a forged cookie worthless.
 */
export type CheckoutAccess = {
  signedIn: boolean
  emailVerified: boolean
}

export const NO_CHECKOUT_ACCESS: CheckoutAccess = {
  signedIn: false,
  emailVerified: false,
}

export const isCheckoutStepId = (value: unknown): value is CheckoutStepId =>
  typeof value === "string" && STEP_IDS.includes(value as CheckoutStepId)

/**
 * Whether the data a step collects is on the cart. `review` collects nothing —
 * it confirms what the earlier steps gathered — so it is never "complete" and
 * never holds anyone back.
 */
export function isStepComplete(
  cart: HttpTypes.StoreCart,
  step: CheckoutStepId,
  access: CheckoutAccess
): boolean {
  switch (step) {
    case "contact":
      return Boolean(cart.email) && (access.signedIn || access.emailVerified)
    case "address":
      return (
        Boolean(cart.shipping_address?.address_1) &&
        Boolean(cart.billing_address?.address_1)
      )
    case "delivery":
      return (cart.shipping_methods?.length ?? 0) > 0
    case "payment":
      return Boolean(cart.payment_collection?.payment_sessions?.length)
    case "review":
      return false
  }
}

/** The step a customer belongs on: the first one still missing its data. */
export function firstIncompleteStep(
  cart: HttpTypes.StoreCart,
  access: CheckoutAccess
): CheckoutStepId {
  return (
    CHECKOUT_STEPS.find((step) => !isStepComplete(cart, step.id, access))
      ?.id ?? "review"
  )
}

/**
 * A step can be opened when every step before it is complete. This is what
 * stops a hand-typed or stale URL from skipping payment details, and it still
 * lets a customer walk back to any step they have already filled in.
 */
export function isStepReachable(
  cart: HttpTypes.StoreCart,
  step: CheckoutStepId,
  access: CheckoutAccess
): boolean {
  const index = STEP_IDS.indexOf(step)

  return CHECKOUT_STEPS.slice(0, index).every((earlier) =>
    isStepComplete(cart, earlier.id, access)
  )
}

/** Resolves a requested step to a usable one, falling back to where they are. */
export function resolveCheckoutStep(
  cart: HttpTypes.StoreCart,
  requested: unknown,
  access: CheckoutAccess
): CheckoutStepId {
  if (isCheckoutStepId(requested) && isStepReachable(cart, requested, access)) {
    return requested
  }

  return firstIncompleteStep(cart, access)
}

/** The step before `step`, for a "back" control. */
export function previousStep(step: CheckoutStepId): CheckoutStepId | null {
  const index = STEP_IDS.indexOf(step)

  return index > 0 ? CHECKOUT_STEPS[index - 1].id : null
}
