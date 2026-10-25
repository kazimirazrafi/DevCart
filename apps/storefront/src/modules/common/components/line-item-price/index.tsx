import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"

type LineItemPriceProps = {
  item: HttpTypes.StoreCartLineItem | HttpTypes.StoreOrderLineItem
  style?: "default" | "tight"
  currencyCode: string
}

const LineItemPrice = ({
  item,
  currencyCode,
}: LineItemPriceProps) => {
  const originalPrice = item.original_total ?? 0
  const currentPrice = item.total ?? 0
  const hasReducedPrice = currentPrice < originalPrice

  return (
    <p className="flex items-baseline gap-2 font-mono text-body text-ink">
      {hasReducedPrice ? (
        <s
          className="text-small text-ink/70"
          data-testid="product-original-price"
        >
          {convertToLocale({
            amount: originalPrice,
            currency_code: currencyCode,
          })}
        </s>
      ) : null}
      <span data-testid="product-price">
        {convertToLocale({ amount: currentPrice, currency_code: currencyCode })}
      </span>
    </p>
  )
}

export default LineItemPrice
