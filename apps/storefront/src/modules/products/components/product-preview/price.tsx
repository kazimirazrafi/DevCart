import { VariantPrice } from "types/global"

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
