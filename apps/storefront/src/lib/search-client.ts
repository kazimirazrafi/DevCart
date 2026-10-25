import {
  createInstantSearchAdapter,
  type MedusaSdkLike,
} from "@medusajs/instantsearch-adapter"

import { sdk } from "@lib/config"

export const PRODUCT_INDEX_NAME = "product"

/** Price fields in the index, one set per currency. Mirrors the backend's search module. */
export const SEARCH_PRICE_CURRENCIES = ["eur", "usd"]

export type PriceField =
  | "min_price"
  | "max_price"
  | "original_price"
  | "on_sale"

/** Falls back to the first indexed currency so a listing always shows a price. */
export const indexedCurrency = (currencyCode: string) => {
  const code = currencyCode.toLowerCase()
  return SEARCH_PRICE_CURRENCIES.includes(code)
    ? code
    : SEARCH_PRICE_CURRENCIES[0]
}

export const priceAttribute = (field: PriceField, currencyCode: string) =>
  `${field}_${indexedCurrency(currencyCode)}`

/** Shared by the navbar search and the store listing. */
export const { searchClient } = createInstantSearchAdapter({
  sdk: sdk as unknown as MedusaSdkLike,
  path: "/store/search",
  additionalSearchParameters: {
    search_options: {
      match_strategy: "last",
      // The postgres provider defaults this off, so the index setting is never reached.
      typo_tolerance: true,
    },
  },
  // Range widgets read facets_stats, which the adapter only computes for fields listed here.
  numericAttributes: SEARCH_PRICE_CURRENCIES.flatMap((currency) => [
    `min_price_${currency}`,
    `max_price_${currency}`,
  ]),
})
