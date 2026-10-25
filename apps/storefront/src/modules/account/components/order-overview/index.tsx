import { HttpTypes } from "@medusajs/types"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { buttonClass } from "@modules/design-system"
import OrderCard from "../order-card"

const OrderOverview = ({ orders }: { orders: HttpTypes.StoreOrder[] }) => {
  if (orders?.length) {
    return (
      <ul className="flex w-full flex-col gap-8" data-testid="orders-list">
        {orders.map((order) => (
          <li key={order.id} data-value={order.id}>
            <OrderCard order={order} />
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div
      className="flex w-full flex-col items-start gap-4"
      data-testid="no-orders-container"
    >
      <h2 className="font-display text-h3 font-bold text-ink">No orders yet</h2>
      <p className="max-w-prose text-body text-ink/80">
        Orders you place appear here with their items, totals and delivery
        state.
      </p>
      <LocalizedClientLink
        href="/store"
        className={buttonClass({ size: "medium", className: "mt-2" })}
        data-testid="continue-shopping-button"
      >
        Start shopping
      </LocalizedClientLink>
    </div>
  )
}

export default OrderOverview
