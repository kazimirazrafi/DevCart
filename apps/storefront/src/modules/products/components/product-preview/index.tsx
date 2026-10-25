import { HttpTypes } from "@medusajs/types"
import { getProductPrice } from "@lib/util/get-product-price"

import ProductCard from "@modules/products/components/product-card"
import PreviewPrice from "./price"

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
