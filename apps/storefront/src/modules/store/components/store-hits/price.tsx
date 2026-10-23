"use client"

import { indexedCurrency, priceAttribute } from "@lib/search-client"
import { convertToLocale } from "@lib/util/money"

/** The per-currency price fields a hit may carry, e.g. `min_price_eur`. */
export type HitPricing = Record<string, unknown>

type HitPriceProps = {
  hit: HitPricing
  currencyCode: string
}

const amount = (value: unknown) => (typeof value === "number" ? value : null)

/**
 * Prices off the search hit. Variants with different prices make the card show
 * a range, and a struck-through original price is the only sale marker the
 * design allows at this size (docs/DESIGN.md §2.1 keeps riso-pink for display type).
 */
const HitPrice = ({ hit, currencyCode }: HitPriceProps) => {
  const currency_code = indexedCurrency(currencyCode)
  const min_price = amount(hit[priceAttribute("min_price", currencyCode)])
  const max_price = amount(hit[priceAttribute("max_price", currencyCode)])
  const original_price = amount(
    hit[priceAttribute("original_price", currencyCode)]
  )
  const on_sale = hit[priceAttribute("on_sale", currencyCode)] === true

  if (min_price === null) {
    return null
  }

  const format = (value: number) =>
    convertToLocale({ amount: value, currency_code })

  const max = max_price ?? min_price
  const isRange = max > min_price

  return (
    <span
      className="flex flex-wrap items-baseline gap-x-2"
      data-testid="product-price"
    >
      {!isRange && on_sale && original_price !== null && (
        <s className="text-ink/70" data-testid="original-price">
          {format(original_price)}
        </s>
      )}
      <span data-testid="price">
        {isRange ? `${format(min_price)} - ${format(max)}` : format(min_price)}
      </span>
    </span>
  )
}

export default HitPrice
