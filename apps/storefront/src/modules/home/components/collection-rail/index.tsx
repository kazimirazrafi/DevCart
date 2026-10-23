import { HttpTypes } from "@medusajs/types"

import InteractiveLink from "@modules/common/components/interactive-link"
import ProductPreview from "@modules/products/components/product-preview"

import RailScroller from "./scroller"

/**
 * One row of products that scrolls sideways — best sellers, new arrivals, a
 * department's picks. It scrolls natively with snap points: on a phone it is a
 * swipe, and on a desktop the RailScroller's buttons and the scrollbar move it,
 * so a mouse can reach the products past the edge.
 */
export default function CollectionRail({
  id,
  title,
  href,
  products,
  region,
  eager,
}: {
  id: string
  title: string
  href: string
  products: HttpTypes.StoreProduct[]
  region: HttpTypes.StoreRegion
  eager?: boolean
}) {
  if (!products.length) {
    return null
  }

  return (
    <section
      aria-labelledby={`${id}-heading`}
      className="content-container border-b border-ink/20 py-10 small:py-14"
      data-testid="collection-rail"
    >
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
        <h2
          id={`${id}-heading`}
          className="font-display text-h2 font-bold tracking-tight"
        >
          {title}
        </h2>
        <InteractiveLink href={href}>View all</InteractiveLink>
      </div>

      <RailScroller label={title}>
        <ul className="flex snap-x snap-mandatory gap-4">
          {products.map((product) => (
            <li
              key={product.id}
              className="w-[64vw] shrink-0 snap-start small:w-[280px]"
            >
              <ProductPreview product={product} region={region} isFeatured={eager} />
            </li>
          ))}
        </ul>
      </RailScroller>
    </section>
  )
}
