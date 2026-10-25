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

/*
 * The listing behind /store and every category page. InstantSearchNext runs the
 * first search on the server, so the grid is in the HTML before hydration.
 */
const StoreTemplate = ({
  currencyCode,
  facetFilters,
  hideCategoryFacet,
  heading = "All products",
}: {
  currencyCode: string
  /* category:<name> entries. */
  facetFilters?: string[]
  hideCategoryFacet?: boolean
  /* null when the page above has already drawn its own title. */
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
          {/* Results first in the DOM, facets first on screen via order. */}
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
