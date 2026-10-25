import type { HttpTypes } from "@medusajs/types"

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

export function firstIncompleteStep(
  cart: HttpTypes.StoreCart,
  access: CheckoutAccess
): CheckoutStepId {
  return (
    CHECKOUT_STEPS.find((step) => !isStepComplete(cart, step.id, access))
      ?.id ?? "review"
  )
}

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

export function previousStep(step: CheckoutStepId): CheckoutStepId | null {
  const index = STEP_IDS.indexOf(step)

  return index > 0 ? CHECKOUT_STEPS[index - 1].id : null
}
