"use client"

import type { SearchClient } from "instantsearch.js"
import { Configure } from "react-instantsearch"
import { InstantSearchNext } from "react-instantsearch-nextjs"

import { PRODUCT_INDEX_NAME, searchClient } from "@lib/search-client"
import { Rule } from "@modules/design-system"
import StoreHits from "@modules/store/components/store-hits"
import StoreRefinements from "@modules/store/components/store-refinements"
import StoreSearchBox from "@modules/store/components/store-search-box"

const PRODUCT_LIMIT = 12

/**
 * The search-driven listing: sidebar, search box, grid and pagination.
 *
 * It is used by `/store` and by every category page. A category page pins the
 * catalogue to one category with `facetFilters` (the adapter turns it into the
 * index's own filter tree) instead of reading the Store API, so both pages
 * share one set of refinements — size, labels, price, on sale and sort — and a
 * filter chosen on a category page narrows that category, not the whole shop.
 *
 * `InstantSearchNext` is what makes the first page exist in the HTML: plain
 * `InstantSearch` rendered nothing on the server, so the products arrived only
 * after React had hydrated, run the search and fetched twelve images — the
 * largest paint of the page and the reason the footer had to be held open with
 * a `120vh` placeholder. The Next variant runs the same search on the server,
 * sends the results down with the page and hydrates onto them, so the plates
 * and the facets are painted before any of that JavaScript runs and the
 * placeholders this page used to need are gone.
 *
 * The page that renders it has to be dynamic (`export const dynamic =
 * "force-dynamic"`): a search whose state depends on the request cannot be
 * baked at build time.
 */
const StoreTemplate = ({
  currencyCode,
  facetFilters,
  hideCategoryFacet,
  heading = "All products",
}: {
  currencyCode: string
  /** `category:<name>` entries; the index ORs values on the same field. */
  facetFilters?: string[]
  /** A category page already is a category, so its facet would only narrow it. */
  hideCategoryFacet?: boolean
  /** `null` when the page above has already drawn its own title. */
  heading?: string | null
}) => {
  return (
    <div className="content-container py-10" data-testid="category-container">
      {heading ? (
        <div className="mb-6 flex flex-col gap-4">
          <h1
            className="font-display text-display"
            data-testid="store-page-title"
          >
            {heading}
          </h1>
          <Rule weight="heavy" />
        </div>
      ) : null}

      <div className="flex flex-col gap-8 small:flex-row small:items-start small:gap-10">
        <InstantSearchNext
          indexName={PRODUCT_INDEX_NAME}
          searchClient={searchClient as unknown as SearchClient}
          routing
          future={{ preserveSharedStateOnUnmount: true }}
        >
          <Configure
            hitsPerPage={PRODUCT_LIMIT}
            {...(facetFilters?.length ? { facetFilters } : {})}
          />
          {/*
           * The results come first in the document even though the filters are
           * first on screen (hence the order classes). Two reasons: a screen
           * reader reaches the products without walking every facet, and the
           * streamed HTML reaches the first product image sooner, which is what
           * the browser's preload scanner and the largest paint depend on. The
           * layout is unchanged: the filters keep the default order and the
           * results carry `order-2`, so the filters are still beside the grid
           * on a desktop and above it on a phone.
           */}
          <div className="order-2 w-full min-w-0">
            <StoreSearchBox />
            <StoreHits
              hitsPerPage={PRODUCT_LIMIT}
              currencyCode={currencyCode}
            />
          </div>
          <StoreRefinements
            currencyCode={currencyCode}
            hideCategoryFacet={hideCategoryFacet}
          />
        </InstantSearchNext>
      </div>
    </div>
  )
}

export default StoreTemplate
