"use client"

import type { Hit } from "instantsearch.js"
import { useEffect, useRef, useState } from "react"
import { useHits, useInstantSearch } from "react-instantsearch"

import useSearchSettled from "@lib/hooks/use-search-settled"
import { Button } from "@modules/design-system"
import ProductCard from "@modules/products/components/product-card"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import SearchPagination from "./pagination"
import HitPrice, { HitPricing } from "./price"

type ProductHit = Hit<
  {
    title: string | null
    handle: string | null
    thumbnail: string | null
  } & HitPricing
>

type StoreHitsProps = {
  hitsPerPage: number
  currencyCode: string
}

/**
 * How long the grid waits for a first response before calling it a failure. A
 * search that only stalls keeps InstantSearch in a loading state with no error,
 * so the timeout is what turns "nothing ever arrives" into something the
 * customer can act on.
 */
const RESPONSE_TIMEOUT_MS = 10_000

const StoreHits = ({ hitsPerPage, currencyCode }: StoreHitsProps) => {
  const { items } = useHits<ProductHit>()
  const { status, error, indexUiState, refresh } = useInstantSearch()
  const { isSearching, hasNoResultsYet, isSettled } = useSearchSettled()
  const [timedOut, setTimedOut] = useState(false)

  const { page, ...refinements } = indexUiState
  const currentPage = page ?? 1
  const refinementKey = JSON.stringify(refinements)

  const settled = useRef({ page: currentPage, refinementKey })

  useEffect(() => {
    if (!isSearching) {
      settled.current = { page: currentPage, refinementKey }
    }
  }, [isSearching, currentPage, refinementKey])

  /*
   * Time the wait from when a query starts, not from the last status change: a
   * client that keeps retrying a dead endpoint keeps emitting status updates,
   * and a resettable timeout would never fire. Answering the query clears the
   * guard so the next failure gets its own countdown.
   */
  useEffect(() => {
    if (!hasNoResultsYet) {
      setTimedOut(false)
      return
    }

    const startedAt = Date.now()
    const timer = window.setInterval(() => {
      if (Date.now() - startedAt >= RESPONSE_TIMEOUT_MS) {
        window.clearInterval(timer)
        setTimedOut(true)
      }
    }, 500)

    return () => window.clearInterval(timer)
  }, [hasNoResultsYet, refinementKey])

  const isPagingOnly =
    refinementKey === settled.current.refinementKey &&
    currentPage !== settled.current.page

  /*
   * The grid is the tallest thing on the listing, so whichever state paints
   * first decides where the footer sits. A response has arrived and is empty
   * only when `isSettled` says so; every other empty grid is still waiting for
   * one. That distinction has to hold identically on the server and on the
   * client's first render, or hydration swaps the server's skeleton for the
   * one-line "no products" message and the twelve plates that follow move the
   * page by more than a screen.
   */
  const settledEmpty = isSettled && !items.length
  const showSkeleton =
    !timedOut &&
    !settledEmpty &&
    (hasNoResultsYet || !items.length || (isSearching && isPagingOnly))

  if (status === "error" || timedOut) {
    return (
      <div
        role="alert"
        className="flex flex-col items-start gap-4 border-y border-ink/20 py-12"
        data-testid="products-error"
      >
        <p className="text-ink">
          {status === "error" && error?.message
            ? `Couldn't load products: ${error.message}`
            : "Couldn't load products. The search service did not respond."}
        </p>
        <Button variant="secondary" onClick={() => refresh()}>
          Try again
        </Button>
      </div>
    )
  }

  return (
    <>
      {showSkeleton ? (
        <SkeletonProductGrid numberOfProducts={hitsPerPage} />
      ) : !items.length ? (
        <p
          className="border-y border-ink/20 py-16 text-center text-ink/75"
          data-testid="no-products"
        >
          No products matched these filters.
        </p>
      ) : (
        <>
          {/* Card titles are `h3`; the listing's own `h1` needs a level between. */}
          <h2 className="sr-only">Products</h2>
          <ul
            className="grid w-full grid-cols-2 gap-x-4 gap-y-8 small:grid-cols-3 small:gap-x-6"
            data-testid="products-list"
          >
          {items.map((hit, index) =>
            hit.handle ? (
              <ProductCard
                key={hit.objectID}
                as="li"
                productId={hit.objectID}
                href={`/products/${hit.handle}`}
                title={hit.title ?? "Untitled product"}
                thumbnail={hit.thumbnail}
                /*
                 * The first row's images are the page's largest paint. Without
                 * `priority` next/image marks every plate `loading="lazy"`, and
                 * the browser's preload scanner skips them — under Lighthouse's
                 * simulated connection that delays the first image to ~2.9 s
                 * even though the markup is in the server HTML. Eager, high
                 * priority on the first four (two rows on a phone, a row and a
                 * bit on a desktop) buys the largest paint back.
                 */
                priority={index === 0}
                price={<HitPrice hit={hit} currencyCode={currencyCode} />}
              />
            ) : null
          )}
          </ul>
        </>
      )}
      <SearchPagination />
    </>
  )
}

export default StoreHits
