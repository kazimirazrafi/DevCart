import { HttpTypes } from "@medusajs/types"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { linkClass } from "@modules/design-system"

type ProductInfoProps = {
  product: HttpTypes.StoreProduct
}

const ProductInfo = ({ product }: ProductInfoProps) => {
  return (
    <div id="product-info" className="flex flex-col gap-3">
      {product.collection && (
        <LocalizedClientLink
          href={`/collections/${product.collection.handle}`}
          className={`${linkClass} self-start text-small`}
        >
          {product.collection.title}
        </LocalizedClientLink>
      )}

      <h1 className="font-display text-h1" data-testid="product-title">
        {product.title}
      </h1>

      {product.description && (
        <p
          className="max-w-[72ch] whitespace-pre-line text-body text-ink/80"
          data-testid="product-description"
        >
          {product.description}
        </p>
      )}
    </div>
  )
}

export default ProductInfo
