import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"

type LineItemUnitPriceProps = {
  item: HttpTypes.StoreCartLineItem | HttpTypes.StoreOrderLineItem
  style?: "default" | "tight"
  currencyCode: string
}

const LineItemUnitPrice = ({
  item,
  currencyCode,
}: LineItemUnitPriceProps) => {
  const quantity = item.quantity || 1
  const total = item.total ?? 0
  const originalTotal = item.original_total ?? 0
  const hasReducedPrice = total < originalTotal

  return (
    <p className="flex items-baseline gap-2 font-mono text-small text-ink/70">
      {hasReducedPrice ? (
        <s data-testid="product-unit-original-price">
          {convertToLocale({
            amount: originalTotal / quantity,
            currency_code: currencyCode,
          })}
        </s>
      ) : null}
      <span data-testid="product-unit-price">
        {convertToLocale({
          amount: total / quantity,
          currency_code: currencyCode,
        })}
      </span>
      <span className="font-sans">each</span>
    </p>
  )
}

export default LineItemUnitPrice
