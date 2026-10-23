import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ProductCard from "@modules/products/components/product-card"
import PreviewPrice from "@modules/products/components/product-preview/price"

/** Five blocks, filled to the nearest whole star. No icon font, no emoji. */
const RatingMeter = ({
  rating,
  label,
}: {
  rating: number
  label: string
}) => {
  const filled = Math.round(rating)

  return (
    <span className="flex items-center gap-2" aria-label={label}>
      <span aria-hidden="true" className="flex gap-1">
        {[1, 2, 3, 4, 5].map((step) => (
          <span
            key={step}
            className={
              step <= filled
                ? "h-2 w-2 bg-ink"
                : "h-2 w-2 border border-ink/40"
            }
          />
        ))}
      </span>
      <span className="font-mono text-small text-ink">
        {rating.toFixed(1)} / 5
      </span>
    </span>
  )
}

export type RatedProductHighlight = {
  product: HttpTypes.StoreProduct
  /** The average of this product's published reviews, to one decimal. */
  rating: number
  reviewCount: number
}

/**
 * The best-reviewed products in the catalogue, with the average and count of
 * their published reviews. Every number here comes from the review module, via
 * `getCatalogueReviewSummary`; nothing is typed into the copy or read from
 * product metadata.
 */
export default function ReviewHighlights({
  items,
  averageRating,
  reviewCount,
}: {
  items: RatedProductHighlight[]
  averageRating: number | null
  reviewCount: number
}) {
  if (!items.length) {
    return null
  }

  return (
    <section
      aria-labelledby="reviews-heading"
      className="content-container border-b border-ink/20 py-10 small:py-14"
      data-testid="review-highlights"
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h2
            id="reviews-heading"
            className="font-display text-h2 font-bold tracking-tight"
          >
            Rated by the people who bought it
          </h2>
          {averageRating !== null ? (
            <p className="text-small text-ink/70">
              {averageRating.toFixed(1)} average across the catalogue, from{" "}
              {reviewCount.toLocaleString("en-US")} published review
              {reviewCount === 1 ? "" : "s"}.
            </p>
          ) : null}
        </div>
        <LocalizedClientLink
          href="/store"
          className="text-riso-blue underline underline-offset-4 hover:text-ink"
        >
          Read the catalogue
        </LocalizedClientLink>
      </div>

      <ul className="grid grid-cols-1 gap-4 small:grid-cols-3">
        {items.map(({ product, rating, reviewCount: productReviews }) => {
          const { cheapestPrice } = getProductPrice({ product })

          return (
            <li key={product.id} className="flex flex-col gap-3">
              <ProductCard
                href={`/products/${product.handle}`}
                title={product.title ?? "Untitled product"}
                thumbnail={product.thumbnail}
                price={
                  cheapestPrice ? <PreviewPrice price={cheapestPrice} /> : null
                }
                meta={`${productReviews} review${
                  productReviews === 1 ? "" : "s"
                }`}
                productId={product.id}
              />
              <RatingMeter
                rating={rating}
                label={`${product.title ?? "This product"} rated ${rating} out of 5 from ${
                  productReviews
                } review${productReviews === 1 ? "" : "s"}`}
              />
            </li>
          )
        })}
      </ul>
    </section>
  )
}
