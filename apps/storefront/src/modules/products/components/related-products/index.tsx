import { listRelatedProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { HttpTypes } from "@medusajs/types"
import { Rule } from "@modules/design-system"
import Product from "../product-preview"

type RelatedProductsProps = {
  product: HttpTypes.StoreProduct
  countryCode: string
}

export default async function RelatedProducts({
  product,
  countryCode,
}: RelatedProductsProps) {
  const region = await getRegion(countryCode)

  if (!region) {
    return null
  }

  const products = await listRelatedProducts({ product, countryCode })

  if (!products.length) {
    return null
  }

  return (
    <section
      aria-labelledby="related-products-heading"
      data-testid="related-products"
      data-related-count={products.length}
    >
      <div className="mb-6 flex flex-col gap-4">
        <h2 id="related-products-heading" className="font-display text-h2">
          Related products
        </h2>
        <Rule weight="heavy" />
      </div>

      <ul className="grid grid-cols-2 gap-x-4 gap-y-8 small:grid-cols-3 small:gap-x-6">
        {products.map((related) => (
          <li key={related.id} data-testid="related-product">
            <Product region={region} product={related} />
          </li>
        ))}
      </ul>
    </section>
  )
}
