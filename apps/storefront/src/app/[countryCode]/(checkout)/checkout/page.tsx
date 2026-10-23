import { retrieveCart } from "@lib/data/cart"
import { getEmailVerification } from "@lib/data/cookies"
import { retrieveCustomer } from "@lib/data/customer"
import { describePaymentReturn } from "@lib/util/payment-status"
import CheckoutSteps from "@modules/checkout/components/checkout-steps"
import {
  resolveCheckoutStep,
  type CheckoutAccess,
} from "@modules/checkout/lib/steps"
import PaymentWrapper from "@modules/checkout/components/payment-wrapper"
import CheckoutForm from "@modules/checkout/templates/checkout-form"
import CheckoutSummary from "@modules/checkout/templates/checkout-summary"
import { Rule } from "@modules/design-system"
import { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Checkout",
}

export default async function Checkout(props: {
  params: Promise<{ countryCode: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [{ countryCode }, searchParams] = await Promise.all([
    props.params,
    props.searchParams,
  ])

  const [cart, customer, verification] = await Promise.all([
    retrieveCart(),
    retrieveCustomer(),
    getEmailVerification(),
  ])

  if (!cart) {
    return notFound()
  }

  /*
   * Whether the contact step is done is not on the cart: a guest's address is
   * only finished once a code was mailed and typed back, and that proof is a
   * token in a cookie rather than a column. It is read here, next to the
   * session, so both halves of "who is checking out" come from one place.
   * The backend re-checks the token when the cart is completed, so this is the
   * page's view of the same fact, not the authority.
   */
  const access: CheckoutAccess = {
    signedIn: Boolean(customer),
    emailVerified: Boolean(
      verification &&
        cart.email &&
        verification.email.toLowerCase() === cart.email.toLowerCase()
    ),
  }

  /*
   * The URL names the step; the cart decides whether it is a step the customer
   * is allowed to be on. A step whose prerequisites are missing sends them back
   * to the first thing still unfinished rather than rendering a form that
   * cannot be submitted.
   */
  const requested = searchParams.step
  const currentStep = resolveCheckoutStep(
    cart,
    Array.isArray(requested) ? requested[0] : requested,
    access
  )

  const paymentError = searchParams.payment_error
  const paymentErrorCode = Array.isArray(paymentError)
    ? paymentError[0]
    : paymentError

  if (currentStep !== requested) {
    const params = new URLSearchParams({ step: currentStep })

    /*
     * A customer redirected to a step they cannot open has still just come back
     * from a payment, so the reason survives the bounce.
     */
    if (paymentErrorCode) {
      params.set("payment_error", paymentErrorCode)
    }

    redirect(`/${countryCode}/checkout?${params}`)
  }

  /*
   * The contact step redirects back with what just happened to a code, so the
   * panel can say "we sent one" instead of guessing. `change=1` reopens the
   * address field when the customer realizes they typed the wrong one.
   */
  const verificationParam = searchParams.verification
  const verificationCode = Array.isArray(verificationParam)
    ? verificationParam[0]
    : verificationParam
  const verificationNotice =
    verificationCode === "sent" || verificationCode === "wait"
      ? verificationCode
      : undefined
  const changingEmail = searchParams.change === "1"

  /*
   * The payment-return route sends the customer back here with a code saying
   * how the off-site payment ended, because the browser never saw the result.
   * It is read here and passed down, so the notice renders on whichever step
   * they land on without any client-side URL parsing.
   */
  const paymentFailure = describePaymentReturn(paymentErrorCode)

  return (
    <>
      <div className="content-container pt-8">
        {/*
         * The steps are `h2`s, so the page needs its `h1` above them. It is for
         * assistive tech only: the stepper already says where the customer is,
         * and a visible "Checkout" title would compete with it.
         */}
        <h1 className="sr-only">Checkout</h1>
        <CheckoutSteps cart={cart} current={currentStep} access={access} />
        <Rule className="mt-4" weight="heavy" />
      </div>

      <div className="content-container grid grid-cols-1 gap-x-16 pb-16 pt-8 small:grid-cols-[minmax(0,1fr)_360px]">
        <PaymentWrapper cart={cart}>
          <CheckoutForm
            cart={cart}
            customer={customer}
            currentStep={currentStep}
            paymentFailure={paymentFailure}
            access={access}
            verificationNotice={verificationNotice}
            changingEmail={changingEmail}
          />
        </PaymentWrapper>
        <CheckoutSummary cart={cart} />
      </div>
    </>
  )
}
