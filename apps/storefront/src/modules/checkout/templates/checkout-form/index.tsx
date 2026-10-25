import { listCartShippingMethods } from "@lib/data/fulfillment"
import { listCartPaymentMethods } from "@lib/data/payment"
import type { PaymentFailure } from "@lib/util/payment-status"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { linkClass } from "@modules/design-system"
import Addresses from "@modules/checkout/components/addresses"
import Contact from "@modules/checkout/components/contact"
import Payment from "@modules/checkout/components/payment"
import Review from "@modules/checkout/components/review"
import Shipping from "@modules/checkout/components/shipping"
import type {
  CheckoutAccess,
  CheckoutStepId,
} from "@modules/checkout/lib/steps"

export default async function CheckoutForm({
  cart,
  customer,
  currentStep,
  paymentFailure,
  access,
  verificationNotice,
  changingEmail,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
  currentStep: CheckoutStepId
  paymentFailure?: PaymentFailure | null
  access: CheckoutAccess
  verificationNotice?: "sent" | "wait"
  changingEmail?: boolean
}) {
  if (!cart) {
    return null
  }

  const [shippingMethods, paymentMethods] = await Promise.all([
    listCartShippingMethods(cart.id),
    listCartPaymentMethods(cart.region?.id ?? ""),
  ])

  if (!shippingMethods?.length || !paymentMethods?.length) {
    return (
      <div
        role="alert"
        className="flex flex-col items-start gap-3 border border-ink p-6"
        data-testid="checkout-unavailable"
      >
        <h2 className="font-display text-lead font-bold">
          Checkout is unavailable
        </h2>
        <p className="text-small text-ink/80">
          Delivery or payment options could not be loaded for this region.
          Try again in a moment.
        </p>
        <LocalizedClientLink href="/cart" className={linkClass}>
          Back to the cart
        </LocalizedClientLink>
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-8">
      <Contact
        cart={cart}
        customer={customer}
        isOpen={currentStep === "contact"}
        access={access}
        verificationNotice={verificationNotice}
        changingEmail={changingEmail}
      />

      <Addresses
        cart={cart}
        customer={customer}
        isOpen={currentStep === "address"}
      />

      <Shipping
        cart={cart}
        availableShippingMethods={shippingMethods}
        isOpen={currentStep === "delivery"}
      />

      <Payment
        cart={cart}
        availablePaymentMethods={paymentMethods}
        isOpen={currentStep === "payment"}
        returnedFailure={paymentFailure}
      />

      <Review
        cart={cart}
        isOpen={currentStep === "review"}
        returnedFailure={paymentFailure}
      />
    </div>
  )
}
