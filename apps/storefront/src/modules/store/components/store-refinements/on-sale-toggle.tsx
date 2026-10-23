"use client"

import { useToggleRefinement } from "react-instantsearch"

import { priceAttribute } from "@lib/search-client"

/**
 * Narrows to products whose calculated price is below their original in the
 * region's currency. Hides itself when nothing is discounted, which is the
 * case until a price list applies to some product.
 */
const OnSaleToggle = ({ currencyCode }: { currencyCode: string }) => {
  const { value, refine, canRefine } = useToggleRefinement({
    attribute: priceAttribute("on_sale", currencyCode),
    on: true,
  })

  if (!canRefine) {
    return null
  }

  return (
    <label className="flex cursor-pointer items-center gap-2 text-small">
      <input
        type="checkbox"
        checked={value.isRefined}
        onChange={() => refine(value)}
        className="h-4 w-4 shrink-0 accent-riso-blue"
        data-testid="on-sale-toggle"
      />
      <span className="font-semibold text-ink">On sale only</span>
      {typeof value.count === "number" && (
        <span className="font-mono text-micro text-ink/70">
          {value.count}
        </span>
      )}
    </label>
  )
}

export default OnSaleToggle
