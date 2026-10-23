import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartTotals from "@modules/common/components/cart-totals"
import Help from "@modules/order/components/help"
import Items from "@modules/order/components/items"
import OnboardingCta from "@modules/order/components/onboarding-cta"
import OrderDetails from "@modules/order/components/order-details"
import PaymentDetails from "@modules/order/components/payment-details"
import ShippingDetails from "@modules/order/components/shipping-details"
import { paymentSummary } from "@modules/order/lib/payment-summary"
import { Rule, buttonClass } from "@modules/design-system"
import { cookies as nextCookies } from "next/headers"

type OrderCompletedTemplateProps = {
  order: HttpTypes.StoreOrder
}

/**
 * What the customer sees immediately after checkout: the order number first,
 * then what was bought, what it cost and where it is going. Everything here
 * reads from the order the Store API returned, so the page is a receipt for
 * what was actually created rather than a replay of the cart.
 */
export default async function OrderCompletedTemplate({
  order,
}: OrderCompletedTemplateProps) {
  const cookies = await nextCookies()

  const isOnboarding = cookies.get("_medusa_onboarding")?.value === "true"

  /*
   * The first thing a customer checks on this page is whether the money moved.
   * It is answered in the header, from the order's payment status, and again
   * beside the payment method further down.
   */
  const payment = paymentSummary(order)

  return (
    <div className="content-container py-10 small:py-16">
      <div
        className="flex w-full max-w-3xl flex-col gap-8"
        data-testid="order-complete-container"
      >
        {isOnboarding && <OnboardingCta orderId={order.id} />}

        <header className="flex flex-col gap-2">
          <h1 className="font-display text-h1 font-bold">Thank you</h1>
          <p className="text-body text-ink/80">
            Your order was placed successfully.
          </p>

          <p
            role="status"
            className="border-l-2 border-ink pl-3 text-body text-ink"
            data-testid="order-payment-summary"
            data-payment-state={payment.state}
          >
            <span className="font-semibold">{payment.headline}.</span>{" "}
            {payment.detail}
          </p>
        </header>

        <div className="flex flex-col gap-1 border border-ink p-5">
          <span className="text-small font-semibold">Order number</span>
          <span
            className="font-mono text-h3"
            data-testid="order-number"
            data-value={order.display_id}
          >
            {order.display_id}
          </span>
        </div>

        <OrderDetails order={order} />

        <section aria-labelledby="order-summary-heading" className="flex flex-col gap-4">
          <h2
            id="order-summary-heading"
            className="font-display text-h3 font-bold"
          >
            Summary
          </h2>
          <Items order={order} />
          <CartTotals totals={order} />
        </section>

        <Rule weight="heavy" />

        <ShippingDetails order={order} />
        <PaymentDetails order={order} />

        <div>
          <LocalizedClientLink
            href="/store"
            className={buttonClass({ size: "large" })}
            data-testid="continue-shopping-button"
          >
            Continue shopping
          </LocalizedClientLink>
        </div>

        <Help />
      </div>
    </div>
  )
}
