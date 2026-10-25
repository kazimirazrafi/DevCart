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

  // A guest's verified address lives in a cookie, not on the cart. The backend
  // re-checks the token on completion, so this is a view of the fact.
  const access: CheckoutAccess = {
    signedIn: Boolean(customer),
    emailVerified: Boolean(
      verification &&
        cart.email &&
        verification.email.toLowerCase() === cart.email.toLowerCase()
    ),
  }

  // The URL names the step, the cart decides whether it is reachable; an
  // unfinished prerequisite redirects to the first thing still missing.
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

    // A customer bounced between steps has still just returned from a payment.
    if (paymentErrorCode) {
      params.set("payment_error", paymentErrorCode)
    }

    redirect(`/${countryCode}/checkout?${params}`)
  }

  // The contact step returns with a code so the panel can say what happened;
  // change=1 reopens the address field.
  const verificationParam = searchParams.verification
  const verificationCode = Array.isArray(verificationParam)
    ? verificationParam[0]
    : verificationParam
  const verificationNotice =
    verificationCode === "sent" || verificationCode === "wait"
      ? verificationCode
      : undefined
  const changingEmail = searchParams.change === "1"

  // The payment-return route brings the outcome back as a code, read here and
  // passed down so the notice renders on whichever step the customer lands.
  const paymentFailure = describePaymentReturn(paymentErrorCode)

  return (
    <>
      <div className="content-container pt-8">
        {/* The steps are h2s, so this h1 is for assistive tech only. */}
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
