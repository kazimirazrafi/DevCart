import { HttpTypes } from "@medusajs/types"

import { getProductPrice } from "@lib/util/get-product-price"

/**
 * Price of the selected variant, or the cheapest variant as a "from" price
 * before anything is selected. `data-value` carries the raw amount so the cart
 * and tests never have to parse a formatted string.
 */
export default function ProductPrice({
  product,
  variant,
}: {
  product: HttpTypes.StoreProduct
  variant?: HttpTypes.StoreProductVariant
}) {
  const { cheapestPrice, variantPrice } = getProductPrice({
    product,
    variantId: variant?.id,
  })

  const selectedPrice = variant ? variantPrice : cheapestPrice

  if (!selectedPrice) {
    return (
      <div
        className="h-8 w-32 animate-pulse bg-ink/10 motion-reduce:animate-none"
        aria-hidden="true"
      />
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <p className="flex flex-wrap items-baseline gap-x-3 font-mono text-lead text-ink">
        {!variant && <span className="font-sans text-small text-ink/70">From</span>}
        <span
          data-testid="product-price"
          data-value={selectedPrice.calculated_price_number}
        >
          {selectedPrice.calculated_price}
        </span>
        {selectedPrice.price_type === "sale" && (
          <s
            className="text-small text-ink/70"
            data-testid="original-product-price"
            data-value={selectedPrice.original_price_number}
          >
            {selectedPrice.original_price}
          </s>
        )}
      </p>
      {selectedPrice.price_type === "sale" && (
        <p className="text-small text-ink/70">
          {selectedPrice.percentage_diff}% off the original price
        </p>
      )}
    </div>
  )
}
