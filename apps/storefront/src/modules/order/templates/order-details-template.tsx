import { HttpTypes } from "@medusajs/types"

import CartTotals from "@modules/common/components/cart-totals"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Rule, linkClass } from "@modules/design-system"
import Help from "@modules/order/components/help"
import Items from "@modules/order/components/items"
import OrderDetails from "@modules/order/components/order-details"
import PaymentDetails from "@modules/order/components/payment-details"
import ShippingDetails from "@modules/order/components/shipping-details"

type OrderDetailsTemplateProps = {
  order: HttpTypes.StoreOrder
}

const OrderDetailsTemplate = ({ order }: OrderDetailsTemplateProps) => {
  return (
    <div
      className="flex w-full flex-col gap-8"
      data-testid="order-details-container"
    >
      <div className="flex flex-col gap-4">
        <LocalizedClientLink
          href="/account/orders"
          className={linkClass}
          data-testid="back-to-overview-button"
        >
          Back to orders
        </LocalizedClientLink>

        <h1 className="font-display text-h1 font-bold text-ink">
          Order{" "}
          <span
            className="font-mono"
            data-testid="order-number"
            data-value={order.display_id}
          >
            {order.display_id}
          </span>
        </h1>
      </div>

      <OrderDetails order={order} showStatus />

      <section
        aria-labelledby="order-summary-heading"
        className="flex flex-col gap-4"
      >
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

      <Help />
    </div>
  )
}

export default OrderDetailsTemplate
