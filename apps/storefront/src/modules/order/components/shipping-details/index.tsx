import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { Rule } from "@modules/design-system"

type ShippingDetailsProps = {
  order: HttpTypes.StoreOrder
}

const ShippingDetails = ({ order }: ShippingDetailsProps) => {
  return (
    <div>
      <h2 className="my-6 font-display text-h3 font-bold">Delivery</h2>
      <div className="flex flex-col gap-6 small:flex-row small:items-start small:gap-x-8">
        <div
          className="flex w-full min-w-0 flex-col small:w-1/3"
          data-testid="shipping-address-summary"
        >
          <p className="mb-1 text-small font-semibold text-ink">
            Shipping Address
          </p>
          <p className="break-words text-small text-ink/80 [overflow-wrap:anywhere]">
            {order.shipping_address?.first_name}{" "}
            {order.shipping_address?.last_name}
          </p>
          <p className="break-words text-small text-ink/80 [overflow-wrap:anywhere]">
            {order.shipping_address?.address_1}{" "}
            {order.shipping_address?.address_2}
          </p>
          <p className="break-words text-small text-ink/80 [overflow-wrap:anywhere]">
            {order.shipping_address?.postal_code},{" "}
            {order.shipping_address?.city}
          </p>
          <p className="break-words text-small text-ink/80 [overflow-wrap:anywhere]">
            {order.shipping_address?.country_code?.toUpperCase()}
          </p>
        </div>

        <div
          className="flex w-full min-w-0 flex-col small:w-1/3"
          data-testid="shipping-contact-summary"
        >
          <p className="mb-1 text-small font-semibold text-ink">Contact</p>
          <p className="break-words text-small text-ink/80">
            {order.shipping_address?.phone}
          </p>
          <p
            className="break-words text-small text-ink/80 [overflow-wrap:anywhere]"
            data-testid="shipping-contact-email"
          >
            {order.email}
          </p>
        </div>

        <div
          className="flex w-full min-w-0 flex-col small:w-1/3"
          data-testid="shipping-method-summary"
        >
          <p className="mb-1 text-small font-semibold text-ink">Method</p>
          <p className="break-words text-small text-ink/80 [overflow-wrap:anywhere]">
            {(order.shipping_methods?.[0] as { name?: string })?.name} (
            {convertToLocale({
              amount: order.shipping_methods?.[0]?.total ?? 0,
              currency_code: order.currency_code,
            })}
            )
          </p>
        </div>
      </div>
      <Rule className="mt-8" />
    </div>
  )
}

export default ShippingDetails
