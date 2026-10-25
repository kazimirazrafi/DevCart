import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { buttonClass } from "@modules/design-system"
import { formatOrderStatus } from "@modules/order/lib/format-status"
import Image from "next/image"

type OrderCardProps = {
  order: HttpTypes.StoreOrder
}

const OrderCard = ({ order }: OrderCardProps) => {
  const units =
    order.items?.reduce((total, item) => total + item.quantity, 0) ?? 0

  const shown = (order.items ?? []).slice(0, 3)
  const remaining = (order.items?.length ?? 0) - shown.length

  return (
    <article
      className="flex w-full flex-col border border-ink bg-stock"
      data-testid="order-card"
    >
      <div className="flex flex-wrap items-start justify-between gap-x-10 gap-y-4 p-5">
        <div className="flex flex-col gap-1">
          <span className="text-small text-ink/70">Order</span>
          <span
            className="font-mono text-lead font-semibold text-ink"
            data-testid="order-display-id"
            data-value={order.display_id}
          >
            {order.display_id}
          </span>
        </div>

        <dl className="flex flex-wrap gap-x-10 gap-y-4">
          <div className="flex flex-col gap-1">
            <dt className="text-small text-ink/70">Placed</dt>
            <dd
              className="text-small text-ink"
              data-testid="order-created-at"
              data-value={order.created_at}
            >
              {new Date(order.created_at).toDateString()}
            </dd>
          </div>

          <div className="flex flex-col gap-1">
            <dt className="text-small text-ink/70">
              {units === 1 ? "Item" : "Items"}
            </dt>
            <dd
              className="text-small text-ink"
              data-testid="order-item-count"
              data-value={units}
            >
              {units}
            </dd>
          </div>

          <div className="flex flex-col gap-1">
            <dt className="text-small text-ink/70">Delivery</dt>
            <dd
              className="text-small text-ink"
              data-testid="order-fulfillment-status"
              data-value={order.fulfillment_status}
            >
              {formatOrderStatus(order.fulfillment_status)}
            </dd>
          </div>

          <div className="flex flex-col gap-1">
            <dt className="text-small text-ink/70">Total</dt>
            <dd
              className="font-mono text-small text-ink"
              data-testid="order-amount"
              data-value={order.total}
            >
              {convertToLocale({
                amount: order.total,
                currency_code: order.currency_code,
              })}
            </dd>
          </div>
        </dl>
      </div>

      <ul
        className="flex flex-col divide-y divide-ink/20 border-t border-ink px-5"
        data-testid="order-items"
      >
        {shown.map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-4 py-3"
            data-testid="order-item"
          >
            <span className="flex h-14 w-14 shrink-0 items-center overflow-hidden border border-ink bg-ink/5">
              {item.thumbnail ? (
                <Image
                  src={item.thumbnail}
                  alt=""
                  width={56}
                  height={56}
                  className="h-full w-full object-cover"
                />
              ) : null}
            </span>
            <span className="flex min-w-0 flex-col">
              <span
                className="truncate text-small font-semibold text-ink"
                data-testid="item-title"
              >
                {item.title}
              </span>
              <span className="text-small text-ink/70">
                <span data-testid="item-quantity">{item.quantity}</span>
                {" × "}
                {convertToLocale({
                  amount: item.unit_price,
                  currency_code: order.currency_code,
                })}
              </span>
            </span>
          </li>
        ))}

        {remaining > 0 && (
          <li className="py-3 text-small text-ink/70" data-testid="order-more-items">
            {remaining} more {remaining === 1 ? "item" : "items"}
          </li>
        )}
      </ul>

      <div className="flex justify-end border-t border-ink p-5">
        <LocalizedClientLink
          href={`/account/orders/details/${order.id}`}
          className={buttonClass({ variant: "secondary", size: "small" })}
          data-testid="order-details-link"
        >
          See details
        </LocalizedClientLink>
      </div>
    </article>
  )
}

export default OrderCard
