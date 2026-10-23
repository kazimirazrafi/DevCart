import { VariantPrice } from "types/global"

/*
 * A priced variant. The struck-through original is the only sale marker: a
 * second ink (riso-pink) would fail contrast at this size, and the design only
 * spends pink on large display type (docs/DESIGN.md §2.1).
 */
export default function PreviewPrice({ price }: { price: VariantPrice }) {
  if (!price) {
    return null
  }

  return (
    <span className="flex flex-wrap items-baseline gap-x-2">
      {price.price_type === "sale" && (
        <s className="text-ink/70" data-testid="original-price">
          {price.original_price}
        </s>
      )}
      <span data-testid="price">{price.calculated_price}</span>
    </span>
  )
}
