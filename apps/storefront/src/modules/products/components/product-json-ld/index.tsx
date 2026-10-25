import { HttpTypes } from "@medusajs/types"

import type { ReviewSummary } from "@lib/data/reviews"
import { getBaseURL, getStoreName } from "@lib/util/env"
import { remainingUnits } from "@lib/util/stock"

type PricedVariant = HttpTypes.StoreProductVariant & {
  calculated_price?: {
    calculated_amount: number
    currency_code: string
  }
}

/** Product descriptions may hold markup; a JSON-LD value must not. */
const plainText = (value?: string | null) =>
  value
    ? value
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    : ""

export default function ProductJsonLd({
  product,
  countryCode,
  reviewSummary,
}: {
  product: HttpTypes.StoreProduct
  countryCode: string
  reviewSummary?: ReviewSummary
}) {
  const variants = (product.variants ?? []) as PricedVariant[]
  const images = (product.images ?? [])
    .map((image) => image.url)
    .filter((image): image is string => Boolean(image))
  const productUrl = `${getBaseURL().replace(/\/+$/, "")}/${countryCode}/products/${product.handle}`

  const offers = variants
    .filter(
      (variant) => typeof variant.calculated_price?.calculated_amount === "number"
    )
    .map((variant) => {
      const price = variant.calculated_price!
      const units = remainingUnits(variant)

      return {
        "@type": "Offer",
        url: `${productUrl}?v_id=${variant.id}`,
        sku: variant.sku ?? undefined,
        price: price.calculated_amount.toFixed(2),
        priceCurrency: price.currency_code.toUpperCase(),
        availability:
          units === 0
            ? "https://schema.org/OutOfStock"
            : "https://schema.org/InStock",
        itemCondition: "https://schema.org/NewCondition",
      }
    })

  const rated =
    reviewSummary && reviewSummary.count > 0 && reviewSummary.average > 0

  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title ?? undefined,
    description: plainText(product.description) || undefined,
    image: images,
    sku: variants[0]?.sku ?? product.id,
    brand: { "@type": "Brand", name: getStoreName() },
    category: product.categories?.[0]?.name ?? undefined,
    url: productUrl,
    offers,
    aggregateRating: rated
      ? {
          "@type": "AggregateRating",
          ratingValue: reviewSummary!.average.toFixed(1),
          reviewCount: reviewSummary!.count,
          bestRating: 5,
          worstRating: 1,
        }
      : undefined,
  }

  return (
    <script
      type="application/ld+json"
      // `<` is escaped so a title or description can never close the element.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  )
}
