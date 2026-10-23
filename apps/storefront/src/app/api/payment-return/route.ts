import { sdk } from "@lib/config"
import { placeOrder } from "@lib/data/cart"
import { getAuthHeaders, setCartId } from "@lib/data/cookies"
import type { PaymentFailureKind } from "@lib/util/payment-status"
import { HttpTypes } from "@medusajs/types"
import { NextRequest, NextResponse } from "next/server"

/** The codes `describePaymentReturn` turns back into a sentence. */
const RETURN_CODE: Record<PaymentFailureKind, string> = {
  payment_failed: "declined",
  payment_pending: "pending",
  cart_problem: "order",
}

export async function GET(req: NextRequest) {
  const { origin, searchParams } = req.nextUrl

  const cartId = searchParams.get("cart_id")
  const countryCode = searchParams.get("country_code")
  const paymentIntent = searchParams.get("payment_intent")
  const paymentIntentClientSecret = searchParams.get(
    "payment_intent_client_secret"
  )
  const redirectStatus = searchParams.get("redirect_status")

  // Without a country code the middleware resolves the customer's region and
  // prefixes it; either way every redirect below stays on this origin.
  const prefix = countryCode ? `/${countryCode}` : ""
  const rejected = () =>
    NextResponse.redirect(`${origin}${prefix}/cart?error=payment_failed`)

  /*
   * Every outcome comes back to the payment step with a code, because the
   * customer left before Stripe could tell the browser anything. The step is
   * where a card can be retried, and the notice there says why they are back.
   */
  const backToPayment = (code: string, extra?: Record<string, string>) => {
    const params = new URLSearchParams({
      step: "payment",
      payment_error: code,
      ...extra,
    })

    return NextResponse.redirect(`${origin}${prefix}/checkout?${params}`)
  }

  if (!cartId || !paymentIntent || !paymentIntentClientSecret) {
    return rejected()
  }

  const cart = await sdk.client
    .fetch<HttpTypes.StoreCartResponse>(`/store/carts/${cartId}`, {
      method: "GET",
      query: { fields: "payment_collection.payment_sessions.data" },
      headers: { ...(await getAuthHeaders()) },
      cache: "no-store",
    })
    .then(({ cart }) => cart)
    .catch(() => null)

  const paymentSession = cart?.payment_collection?.payment_sessions?.find(
    (session) => session.data?.id === paymentIntent
  )

  if (
    !paymentSession ||
    paymentSession.data?.client_secret !== paymentIntentClientSecret
  ) {
    return rejected()
  }

  await setCartId(cartId)

  // The customer backed out or the bank declined. Stripe puts the PaymentIntent
  // back into `requires_payment_method`, so the Payment Element can mount
  // against it again — return to the payment step and let them retry.
  if (redirectStatus === "failed") {
    return backToPayment("declined")
  }

  /*
   * Stripe says the off-site authorization finished, which is not the same as
   * the order existing: `placeOrder` completes the cart on the server, where
   * Medusa confirms the payment with Stripe before it builds the order, and
   * only a real order redirects to its confirmation page.
   */
  const placed = await placeOrder(cartId)

  if (!placed.ok) {
    return backToPayment(RETURN_CODE[placed.kind])
  }

  // Only reached when the cart did not convert into an order; a placed order
  // redirects out of `placeOrder`.
  return backToPayment(RETURN_CODE.cart_problem)
}
