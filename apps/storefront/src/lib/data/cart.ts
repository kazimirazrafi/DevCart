"use server"

import { sdk } from "@lib/config"
import {
  type CheckoutStepState,
  isValidEmail,
} from "@lib/util/checkout-validation"
import medusaErrorMessage, { medusaError } from "@lib/util/medusa-error"
import { orderConfirmationPath } from "@lib/util/order-access"
import {
  describePlaceOrderFailure,
  type PaymentFailure,
} from "@lib/util/payment-status"
import { HttpTypes } from "@medusajs/types"
import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import {
  getAuthHeaders,
  getCacheOptions,
  getCacheTag,
  getCartId,
  removeCartId,
  setCartId,
} from "./cookies"
import { getRegion } from "./regions"
import { getLocale } from "./locale-actions"
import {
  emailVerificationHeaders,
  forgetVerificationFor,
  isEmailVerified,
  requestVerificationCode,
} from "./email-verification"

/**
 * Retrieves a cart by its ID. If no ID is provided, it will use the cart ID from the cookies.
 * @param cartId - optional - The ID of the cart to retrieve.
 * @returns The cart object if found, or null if not found.
 */
export async function retrieveCart(cartId?: string, fields?: string) {
  const id = cartId || (await getCartId())
  fields ??=
    "*items, *region, *items.product, *items.variant, *items.thumbnail, *items.metadata, +items.total, *promotions, +shipping_methods.name"

  if (!id) {
    return null
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  /*
   * Read the cart uncached. It is per-customer data that changes on every
   * mutation, and the storefront re-renders it from inside the server action
   * that just wrote it: with a cached read, that re-render can be served the
   * entry from before the change and repaint the previous totals (measured as
   * a stale subtotal in roughly one quantity change in ten). The routes that
   * read a cart are dynamic anyway, so the cache saved one round trip and cost
   * correctness.
   */
  return await sdk.client
    .fetch<HttpTypes.StoreCartResponse>(`/store/carts/${id}`, {
      method: "GET",
      query: {
        fields,
      },
      headers,
      cache: "no-store",
    })
    .then(({ cart }: { cart: HttpTypes.StoreCart }) => cart)
    .catch(() => null)
}

export async function getOrSetCart(countryCode: string) {
  const region = await getRegion(countryCode)

  if (!region) {
    throw new Error(`Region not found for country code: ${countryCode}`)
  }

  let cart = await retrieveCart(undefined, "id,region_id")

  const headers = {
    ...(await getAuthHeaders()),
  }

  if (!cart) {
    const locale = await getLocale()
    const cartResp = await sdk.store.cart.create(
      { region_id: region.id, locale: locale || undefined },
      {},
      headers
    )
    cart = cartResp.cart

    await setCartId(cart.id)

    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag)
  }

  if (cart && cart?.region_id !== region.id) {
    await sdk.store.cart.update(cart.id, { region_id: region.id }, {}, headers)
    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag)
  }

  return cart
}

export async function updateCart(data: HttpTypes.StoreUpdateCart) {
  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("No existing cart found, please create one before updating")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.cart
    .update(cartId, data, {}, headers)
    .then(async ({ cart }: { cart: HttpTypes.StoreCart }) => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)

      const fulfillmentCacheTag = await getCacheTag("fulfillment")
      revalidateTag(fulfillmentCacheTag)

      return cart
    })
    .catch(medusaError)
}

/*
 * What a cart mutation reports back to its caller. Failures are *returned*, not
 * thrown: a production build replaces a thrown server-action error with generic
 * copy, so a thrown message never reaches the customer (see
 * `lib/util/medusa-error.ts`).
 */
export type CartMutationResult = { ok: true } | { ok: false; message: string }

export async function addToCart({
  variantId,
  quantity,
  countryCode,
}: {
  variantId: string
  quantity: number
  countryCode: string
}): Promise<CartMutationResult> {
  if (!variantId) {
    return { ok: false, message: "Could not add this to the cart. Try again." }
  }

  try {
    const cart = await getOrSetCart(countryCode)

    if (!cart) {
      return {
        ok: false,
        message: "Could not add this to the cart. Try again.",
      }
    }

    const headers = {
      ...(await getAuthHeaders()),
    }

    await sdk.store.cart.createLineItem(
      cart.id,
      {
        variant_id: variantId,
        quantity,
      },
      {},
      headers
    )
  } catch (error) {
    return { ok: false, message: medusaErrorMessage(error) }
  }

  const cartCacheTag = await getCacheTag("carts")
  revalidateTag(cartCacheTag)

  const fulfillmentCacheTag = await getCacheTag("fulfillment")
  revalidateTag(fulfillmentCacheTag)

  return { ok: true }
}

export async function updateLineItem({
  lineId,
  quantity,
}: {
  lineId: string
  quantity: number
}): Promise<CartMutationResult> {
  const cartId = await getCartId()

  if (!lineId || !cartId) {
    console.error("Missing cart or line item id when updating a line item")
    return { ok: false, message: "Could not update the quantity. Try again." }
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  try {
    await sdk.store.cart.updateLineItem(cartId, lineId, { quantity }, {}, headers)
  } catch (error) {
    return { ok: false, message: medusaErrorMessage(error) }
  }

  const cartCacheTag = await getCacheTag("carts")
  revalidateTag(cartCacheTag)

  const fulfillmentCacheTag = await getCacheTag("fulfillment")
  revalidateTag(fulfillmentCacheTag)

  return { ok: true }
}

export async function deleteLineItem(
  lineId: string
): Promise<CartMutationResult> {
  const cartId = await getCartId()

  if (!lineId || !cartId) {
    console.error("Missing cart or line item id when deleting a line item")
    return { ok: false, message: "Could not remove this item. Try again." }
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  try {
    await sdk.store.cart.deleteLineItem(cartId, lineId, {}, headers)
  } catch (error) {
    return { ok: false, message: medusaErrorMessage(error) }
  }

  const cartCacheTag = await getCacheTag("carts")
  revalidateTag(cartCacheTag)

  const fulfillmentCacheTag = await getCacheTag("fulfillment")
  revalidateTag(fulfillmentCacheTag)

  return { ok: true }
}

export async function setShippingMethod({
  cartId,
  shippingMethodId,
}: {
  cartId: string
  shippingMethodId: string
}): Promise<CartMutationResult> {
  const headers = {
    ...(await getAuthHeaders()),
  }

  try {
    await sdk.store.cart.addShippingMethod(
      cartId,
      { option_id: shippingMethodId },
      {},
      headers
    )
  } catch (error) {
    return { ok: false, message: medusaErrorMessage(error) }
  }

  const cartCacheTag = await getCacheTag("carts")
  revalidateTag(cartCacheTag)

  return { ok: true }
}

export async function initiatePaymentSession(
  cart: HttpTypes.StoreCart,
  data: HttpTypes.StoreInitializePaymentSession
): Promise<CartMutationResult> {
  const headers = {
    ...(await getAuthHeaders()),
  }

  try {
    await sdk.store.payment.initiatePaymentSession(cart, data, {}, headers)
  } catch (error) {
    return { ok: false, message: medusaErrorMessage(error) }
  }

  const cartCacheTag = await getCacheTag("carts")
  revalidateTag(cartCacheTag)

  return { ok: true }
}

/*
 * What a promotion change reports back. Like the other cart mutations the
 * failure is returned rather than thrown: a production build replaces a thrown
 * server-action message with generic copy.
 */
export type PromotionResult =
  | { ok: true; codes: string[] }
  | { ok: false; message: string }

const CART_EXPIRED = "Your cart has expired. Add something to it and try again."

/** The codes the customer applied, in the order the cart holds them. */
const appliedCodes = (cart: HttpTypes.StoreCart) =>
  (cart.promotions ?? [])
    .filter((promotion) => !promotion.is_automatic)
    .map((promotion) => promotion.code ?? "")
    .filter(Boolean)

/**
 * Writes the whole list of codes at once, which is what the cart API takes.
 *
 * Medusa does not reject the request when a code cannot be applied — it drops
 * the promotion from the cart and answers `200` — so the only way to tell the
 * customer their code was refused is to read the applied promotions back. A
 * refused code is then removed from the cart, so it does not ride along on
 * every later change and start working once the cart happens to qualify.
 */
async function writePromotionCodes(codes: string[]): Promise<PromotionResult> {
  const cartId = await getCartId()

  if (!cartId) {
    return { ok: false, message: CART_EXPIRED }
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  const requested = Array.from(
    new Set(codes.map((code) => code.trim()).filter(Boolean))
  )

  let applied: string[]

  try {
    const { cart } = await sdk.store.cart.update(
      cartId,
      { promo_codes: requested },
      { fields: "*promotions" },
      headers
    )
    applied = appliedCodes(cart)
  } catch (error) {
    return { ok: false, message: medusaErrorMessage(error) }
  }

  const refused = requested.filter(
    (code) =>
      !applied.some(
        (appliedCode) => appliedCode.toUpperCase() === code.toUpperCase()
      )
  )

  if (refused.length) {
    try {
      await sdk.store.cart.update(
        cartId,
        { promo_codes: applied },
        {},
        headers
      )
    } catch (error) {
      console.error("Could not drop a refused promotion code", error)
    }
  }

  const cartCacheTag = await getCacheTag("carts")
  revalidateTag(cartCacheTag)

  const fulfillmentCacheTag = await getCacheTag("fulfillment")
  revalidateTag(fulfillmentCacheTag)

  if (refused.length) {
    return {
      ok: false,
      message:
        refused.length === 1
          ? "That promotion code cannot be used for this cart."
          : "Some promotion codes cannot be used for this cart.",
    }
  }

  return { ok: true, codes: applied }
}

export async function applyPromotionCode(code: string): Promise<PromotionResult> {
  const trimmed = code.trim()

  if (!trimmed) {
    return { ok: false, message: "Enter a promotion code." }
  }

  const cart = await retrieveCart(undefined, "id,*promotions")

  if (!cart) {
    return { ok: false, message: CART_EXPIRED }
  }

  return writePromotionCodes([...appliedCodes(cart), trimmed])
}

export async function removePromotionCode(
  code: string
): Promise<PromotionResult> {
  const cart = await retrieveCart(undefined, "id,*promotions")

  if (!cart) {
    return { ok: false, message: CART_EXPIRED }
  }

  const remaining = appliedCodes(cart).filter(
    (appliedCode) => appliedCode.toUpperCase() !== code.trim().toUpperCase()
  )

  return writePromotionCodes(remaining)
}

/*
 * The fields an address is not usable without, and what to say about each.
 * The message is written to be read next to the field it belongs to.
 */
const REQUIRED_ADDRESS_FIELDS: [string, string][] = [
  ["first_name", "Enter a first name."],
  ["last_name", "Enter a last name."],
  ["address_1", "Enter a street address."],
  ["city", "Enter a city."],
  ["postal_code", "Enter a postal code."],
  ["country_code", "Choose a country."],
]

const addressFromForm = (
  text: (name: string) => string,
  prefix: "shipping_address" | "billing_address"
) => ({
  first_name: text(`${prefix}.first_name`),
  last_name: text(`${prefix}.last_name`),
  address_1: text(`${prefix}.address_1`),
  address_2: "",
  company: text(`${prefix}.company`),
  postal_code: text(`${prefix}.postal_code`),
  city: text(`${prefix}.city`),
  country_code: text(`${prefix}.country_code`),
  province: text(`${prefix}.province`),
  phone: text(`${prefix}.phone`),
})

function addressFieldErrors(
  prefix: "shipping_address" | "billing_address",
  address: Record<string, string>
) {
  const errors: Record<string, string> = {}

  for (const [field, message] of REQUIRED_ADDRESS_FIELDS) {
    if (!address[field]) {
      errors[`${prefix}.${field}`] = message
    }
  }

  return errors
}

/**
 * Step 1. The email is collected on its own so a guest is identified before
 * anything else is asked of them, and so the cart has somewhere to send the
 * confirmation from before the address is entered.
 */
export async function setCartEmail(
  _currentState: CheckoutStepState,
  formData: FormData
): Promise<CheckoutStepState> {
  const email = String(formData.get("email") ?? "").trim()
  const countryCode = String(formData.get("country_code") ?? "")

  if (!email) {
    return { fields: { email: "Enter your email address." } }
  }

  if (!isValidEmail(email)) {
    return { fields: { email: "Enter an email address like name@example.com." } }
  }

  const cartId = await getCartId()

  if (!cartId) {
    return {
      message: "Your cart has expired. Add something to it and try again.",
    }
  }

  try {
    await updateCart({ email })
  } catch (error) {
    return { message: medusaErrorMessage(error) }
  }

  /*
   * A previous confirmation proved a different address, which says nothing
   * about this one.
   */
  await forgetVerificationFor(email)

  /*
   * A signed-in customer's address came from their account, and the order is
   * tied to that account whatever they type, so there is nothing left to prove
   * — the backend's completion gate exempts them for the same reason.
   */
  const signedIn = Boolean((await getAuthHeaders()).authorization)

  if (signedIn || (await isEmailVerified(email))) {
    redirect(`/${countryCode}/checkout?step=address`)
  }

  /*
   * A guest proves the address before anything else is asked of them: an
   * order is only reachable through the inbox it is confirmed to, so asking for
   * an address and a delivery slot first would be work done on trust.
   */
  const verification = await requestVerificationCode(email)

  if (verification.ok) {
    redirect(`/${countryCode}/checkout?step=contact&verification=sent`)
  }

  /*
   * The backend's limits are the authority; a code that was mailed a moment ago
   * is still in the inbox, so the step is shown with the wait named. Anything
   * else (the mail provider refused the message, the store is unreachable) is
   * worth staying on the form for, so it can be retried.
   */
  if (
    verification.code === "resend_cooldown" ||
    verification.code === "too_many_codes" ||
    verification.code === "too_many_requests"
  ) {
    redirect(`/${countryCode}/checkout?step=contact&verification=wait`)
  }

  return { message: verification.message }
}

/** Step 2. Validates the address on the server before the cart is written. */
export async function setAddresses(
  _currentState: CheckoutStepState,
  formData: FormData
): Promise<CheckoutStepState> {
  // FormData values are `string | File | null`; the cart API takes text only.
  const text = (name: string) => String(formData.get(name) ?? "").trim()

  const shipping = addressFromForm(text, "shipping_address")
  const sameAsBilling = formData.get("same_as_billing") === "on"
  const billing = sameAsBilling
    ? shipping
    : addressFromForm(text, "billing_address")

  const fields = {
    ...addressFieldErrors("shipping_address", shipping),
    ...(sameAsBilling
      ? {}
      : addressFieldErrors("billing_address", billing)),
  }

  if (Object.keys(fields).length) {
    return { message: "Check the fields below and try again.", fields }
  }

  const cart = await retrieveCart(undefined, "id,email")

  if (!cart) {
    return {
      message: "Your cart has expired. Add something to it and try again.",
    }
  }

  if (!cart.email) {
    return { message: "Add your email address before the shipping address." }
  }

  try {
    await updateCart({
      shipping_address: shipping,
      billing_address: billing,
    })
  } catch (error) {
    return { message: medusaErrorMessage(error) }
  }

  redirect(`/${shipping.country_code}/checkout?step=delivery`)
}

/*
 * Completing a cart returns the order, not the payment: the Store API answers
 * `{ type: "order" }` only after its own server-side authorization with Stripe
 * succeeded. A failure carries a reason we can classify (`payment_failed`,
 * `payment_pending` or `cart_problem`), so the checkout can tell the customer
 * what happened instead of asking them to pay again blindly.
 */
export type PlaceOrderResult = { ok: true } | ({ ok: false } & PaymentFailure)

/**
 * Places an order for a cart. If no cart ID is provided, it will use the cart ID from the cookies.
 * @param cartId - optional - The ID of the cart to place an order for.
 */
export async function placeOrder(
  cartId?: string
): Promise<PlaceOrderResult> {
  const id = cartId || (await getCartId())

  if (!id) {
    return {
      ok: false,
      kind: "cart_problem",
      message: "Your cart has expired. Start a new one.",
    }
  }

  /*
   * Completing a guest's cart is also where the address is proved: the token
   * from the contact step travels with the request, and the backend refuses the
   * completion without it. A signed-in customer sends it too when they have
   * one; the backend ignores it for them.
   */
  const headers = {
    ...(await getAuthHeaders()),
    ...(await emailVerificationHeaders()),
  }

  let cartRes: Awaited<ReturnType<typeof sdk.store.cart.complete>>

  try {
    cartRes = await sdk.store.cart.complete(id, {}, headers)
  } catch (error) {
    /*
     * The route throws for anything that is not a payment outcome: a cart that
     * has already been completed, a cart another request is completing, stock
     * that disappeared. The message goes in the log; the customer gets the
     * classification below.
     */
    return await explainFailedCompletion(id, {
      errorType: (error as { type?: string })?.type,
      errorMessage: medusaErrorMessage(error),
    })
  }

  const cartCacheTag = await getCacheTag("carts")
  revalidateTag(cartCacheTag)

  if (cartRes?.type === "order") {
    const countryCode =
      cartRes.order.shipping_address?.country_code?.toLowerCase()

    const orderCacheTag = await getCacheTag("orders")
    revalidateTag(orderCacheTag)

    removeCartId()

    /*
     * The confirmation page reads the order back through the Store API, which
     * only answers the order's owner or a request holding this token. The cart
     * that just completed is proof enough that this browser may see it, so the
     * token is minted here and expires on its own.
     */
    redirect(
      `/${countryCode}${orderConfirmationPath(cartRes.order.id)}`
    )
  }

  /*
   * The cart came back uncompleted. The route only answers this way for a
   * payment result (`payment_authorization_error`, `payment_requires_more`),
   * and it puts the reason in the body — which used to be dropped here in
   * favour of one generic sentence.
   */
  return await explainFailedCompletion(id, {
    errorType: cartRes?.error?.type,
    errorMessage: cartRes?.error?.message,
  })
}

/**
 * Turns a failed completion into something the customer can act on.
 *
 * The error alone is not always enough — a 400 from the Store API says "session
 * was not authorized" for both a declined card and a payment the bank is still
 * clearing. The payment session is written from Stripe's own answer on the
 * server, so its status is what separates those two cases.
 */
async function explainFailedCompletion(
  cartId: string,
  {
    errorType,
    errorMessage,
  }: { errorType?: string | null; errorMessage?: string | null }
): Promise<PlaceOrderResult> {
  let sessionStatus: string | undefined

  if (!errorType || errorType === "not_allowed") {
    const cart = await retrieveCart(
      cartId,
      "id,*payment_collection.payment_sessions"
    )

    sessionStatus = cart?.payment_collection?.payment_sessions?.find(
      (session) => session.status !== "canceled"
    )?.status
  }

  console.error(
    `Could not complete cart ${cartId}: ${errorMessage ?? errorType ?? "no reason given"}`
  )

  const failure = describePlaceOrderFailure({
    errorType,
    errorMessage,
    sessionStatus,
  })

  return { ok: false, ...failure }
}

/**
 * Updates the countrycode param and revalidates the regions cache
 * @param regionId
 * @param countryCode
 */
export async function updateRegion(countryCode: string, currentPath: string) {
  const cartId = await getCartId()
  const region = await getRegion(countryCode)

  if (!region) {
    throw new Error(`Region not found for country code: ${countryCode}`)
  }

  if (cartId) {
    await updateCart({ region_id: region.id })
    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag)
  }

  const regionCacheTag = await getCacheTag("regions")
  revalidateTag(regionCacheTag)

  const productsCacheTag = await getCacheTag("products")
  revalidateTag(productsCacheTag)

  redirect(`/${countryCode}${currentPath}`)
}

export async function listCartOptions() {
  const cartId = await getCartId()
  const headers = {
    ...(await getAuthHeaders()),
  }
  const next = {
    ...(await getCacheOptions("shippingOptions")),
  }

  return await sdk.client.fetch<{
    shipping_options: HttpTypes.StoreCartShippingOption[]
  }>("/store/shipping-options", {
    query: { cart_id: cartId },
    next,
    headers,
    cache: "force-cache",
  })
}
