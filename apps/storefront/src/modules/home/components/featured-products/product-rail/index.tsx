import { listProducts } from "@lib/data/products"
import { HttpTypes } from "@medusajs/types"

import InteractiveLink from "@modules/common/components/interactive-link"
import ProductPreview from "@modules/products/components/product-preview"

export default async function ProductRail({
  collection,
  region,
}: {
  collection: HttpTypes.StoreCollection
  region: HttpTypes.StoreRegion
}) {
  let products: HttpTypes.StoreProduct[] = []
  let failed = false

  try {
    const result = await listProducts({
      regionId: region.id,
      queryParams: {
        collection_id: collection.id,
        fields: "*variants.calculated_price",
      },
    })
    products = result.response.products
  } catch (error) {
    console.error(`Failed to load homepage collection "${collection.handle}"`, error)
    failed = true
  }

  return (
    <section
      aria-labelledby={`collection-${collection.id}-heading`}
      className="content-container border-b border-ink/20 py-10 small:py-14"
    >
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <h2
          id={`collection-${collection.id}-heading`}
          className="font-display text-h2 font-bold tracking-tight"
        >
          {collection.title}
        </h2>
        <InteractiveLink href={`/collections/${collection.handle}`}>
          View collection
        </InteractiveLink>
      </div>
      {failed ? (
        <p role="alert" className="border-y border-ink/20 py-5 text-ink/75">
          This collection could not be loaded. Open the collection page to try again.
        </p>
      ) : products.length ? (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-8 small:grid-cols-3 small:gap-x-6 small:gap-y-12">
          {products.slice(0, 3).map((product) => (
            <li key={product.id}>
              <ProductPreview product={product} region={region} isFeatured />
            </li>
          ))}
        </ul>
      ) : (
        <p className="border-y border-ink/20 py-5 text-ink/75">
          No products in this collection yet. Check back when the next run is ready.
        </p>
      )}
    </section>
  )
}
