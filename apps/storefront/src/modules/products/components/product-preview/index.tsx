import { HttpTypes } from "@medusajs/types"
import { getProductPrice } from "@lib/util/get-product-price"

import ProductCard from "@modules/products/components/product-card"
import PreviewPrice from "./price"

/**
 * A product from the Medusa catalogue, priced for the current region and shown
 * on the standard plate. `isFeatured` marks the cards in the first rail on the
 * homepage, so their images load eagerly; `region` stays in the signature for
 * the pages that already pass it.
 */
export default async function ProductPreview({
  product,
  isFeatured,
}: {
  product: HttpTypes.StoreProduct
  isFeatured?: boolean
  region: HttpTypes.StoreRegion
}) {
  const { cheapestPrice } = getProductPrice({ product })

  return (
    <ProductCard
      productId={product.id}
      href={`/products/${product.handle}`}
      title={product.title ?? "Untitled product"}
      thumbnail={product.thumbnail}
      price={cheapestPrice ? <PreviewPrice price={cheapestPrice} /> : null}
      priority={isFeatured}
    />
  )
}
