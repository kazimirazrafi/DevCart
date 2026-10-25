import { formatOrderStatus } from "@modules/order/lib/format-status"
import { HttpTypes } from "@medusajs/types"

type OrderDetailsProps = {
  order: HttpTypes.StoreOrder
  showStatus?: boolean
}

const OrderDetails = ({ order, showStatus }: OrderDetailsProps) => {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p className="break-words text-body [overflow-wrap:anywhere]">
        We have sent the order confirmation to{" "}
        <span className="font-semibold" data-testid="order-email">
          {order.email}
        </span>
        .
      </p>

      <p className="text-small text-ink/80">
        Order date:{" "}
        <span data-testid="order-date">
          {new Date(order.created_at).toDateString()}
        </span>
      </p>

      {showStatus && (
        <p className="text-small text-ink/80">
          Order status:{" "}
          <span data-testid="order-status">
            {formatOrderStatus(order.status)}
          </span>{" "}
          · Delivery:{" "}
          <span data-testid="order-fulfillment-status">
            {formatOrderStatus(order.fulfillment_status)}
          </span>{" "}
          · Payment:{" "}
          <span data-testid="order-payment-status">
            {formatOrderStatus(order.payment_status)}
          </span>
        </p>
      )}
    </div>
  )
}

export default OrderDetails
