import { listProductReviews, retrieveReviewer } from "@lib/data/reviews"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Rule, linkClass } from "@modules/design-system"
import ProductReviewForm from "@modules/products/components/product-review-form"

import Stars from "./stars"

const REVIEWS_SHOWN = 10

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value))

/**
 * Reviews for one product: the summary a customer scans, the reviews
 * themselves, and the way to add one.
 *
 * Nothing here decides what is public — the route returns approved reviews
 * only — so this section's job is presentation plus the two states the spec
 * asks every data-driven view to have (a review list is empty until someone
 * writes one, and the form is the signed-in customer's).
 */
const ProductReviews = async ({
  product,
  countryCode,
}: {
  product: HttpTypes.StoreProduct
  countryCode: string
}) => {
  const [{ reviews, count, summary }, customer] = await Promise.all([
    listProductReviews({ productId: product.id, limit: REVIEWS_SHOWN }),
    retrieveReviewer(),
  ])

  const distribution = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: summary.distribution?.[rating] ?? 0,
  }))

  const productPath = `/${countryCode}/products/${product.handle}`

  return (
    <section
      aria-labelledby="product-reviews-heading"
      className="content-container border-t border-ink/20 py-10 small:py-14"
      data-testid="product-reviews"
    >
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h2
            id="product-reviews-heading"
            className="font-display text-h2 font-bold text-ink"
          >
            Reviews
          </h2>
          <p className="text-body text-ink/80" data-testid="reviews-count">
            {summary.count === 0
              ? "No reviews yet."
              : `${summary.count} review${summary.count === 1 ? "" : "s"}`}
          </p>
        </header>

        {summary.count > 0 && (
          <div
            className="grid grid-cols-1 gap-6 border border-ink p-5 small:grid-cols-12"
            data-testid="reviews-summary"
          >
            <div className="flex flex-col items-start gap-1 small:col-span-4">
              <p className="font-mono text-h1 leading-none text-ink">
                <span data-testid="reviews-average" data-value={summary.average}>
                  {summary.average.toFixed(1)}
                </span>
                <span className="font-sans text-small text-ink/70"> / 5</span>
              </p>
              <Stars rating={Math.round(summary.average)} size="display" />
              <p className="text-small text-ink/70">
                Based on {summary.count} review{summary.count === 1 ? "" : "s"}
              </p>
            </div>

            <ul className="flex flex-col gap-1 small:col-span-8">
              {distribution.map(({ rating, count: ratingCount }) => {
                const share =
                  summary.count === 0
                    ? 0
                    : Math.round((ratingCount / summary.count) * 100)

                return (
                  <li
                    key={rating}
                    className="flex items-center gap-3 text-small text-ink"
                    data-testid={`reviews-distribution-${rating}`}
                  >
                    <span className="w-12 shrink-0 font-mono">
                      {rating} star
                    </span>
                    <span
                      aria-hidden="true"
                      className="h-2 flex-1 border border-ink/30 bg-ink/5"
                    >
                      <span
                        className="block h-full bg-riso-blue"
                        style={{ width: `${share}%` }}
                      />
                    </span>
                    <span className="w-8 shrink-0 text-right font-mono">
                      {ratingCount}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {reviews.length > 0 ? (
          <ul className="flex flex-col" data-testid="reviews-list">
            {reviews.map((review) => (
              <li
                key={review.id}
                className="flex flex-col gap-2 border-t border-ink/20 py-6 first:border-t-0"
                data-testid="review"
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Stars rating={review.rating} size="small" />
                  <p className="font-display text-h3 font-bold text-ink">
                    {review.title}
                  </p>
                </div>
                <p className="text-small text-ink/70">
                  {review.author_name} ·{" "}
                  <time dateTime={review.created_at}>
                    {formatDate(review.created_at)}
                  </time>
                </p>
                {review.body && (
                  <p className="max-w-prose whitespace-pre-line text-body text-ink/80">
                    {review.body}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p
            className="max-w-prose text-body text-ink/80"
            data-testid="reviews-empty"
          >
            Nothing here yet. If you have this product, yours would be the first
            thing the next customer reads.
          </p>
        )}

        {count > reviews.length && (
          <p className="text-small text-ink/70" data-testid="reviews-more">
            Showing the {reviews.length} most recent of {count} reviews.
          </p>
        )}

        <Rule />

        {customer ? (
          <ProductReviewForm productId={product.id} />
        ) : (
          <p className="text-body text-ink/80" data-testid="reviews-sign-in">
            Bought this?{" "}
            <LocalizedClientLink
              href={`/account?redirect=${encodeURIComponent(productPath)}`}
              className={linkClass}
            >
              Sign in
            </LocalizedClientLink>{" "}
            to write a review.
          </p>
        )}
      </div>
    </section>
  )
}

export default ProductReviews
