"use client"

import { MagnifyingGlass } from "@medusajs/icons"
import { useCallback, useEffect, useRef, useState } from "react"
import type { SearchClient } from "instantsearch.js"
import {
  Configure,
  InstantSearch,
  useHits,
  useInstantSearch,
  useSearchBox,
} from "react-instantsearch"

import useSearchSettled from "@lib/hooks/use-search-settled"
import { PRODUCT_INDEX_NAME, searchClient } from "@lib/search-client"
import { Text } from "@modules/common/components/ui"
import SearchHit, { ProductHit } from "./hit"

const HITS_PER_PAGE = 12
const DEBOUNCE_MS = 250

const SearchResults = ({ onNavigate }: { onNavigate: () => void }) => {
  const timer = useRef<number | undefined>(undefined)

  const queryHook = useCallback(
    (nextQuery: string, search: (value: string) => void) => {
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => search(nextQuery), DEBOUNCE_MS)
    },
    []
  )

  const { query, refine } = useSearchBox({ queryHook })
  const { items } = useHits<ProductHit>()
  const { status, error } = useInstantSearch()
  const { isSettled } = useSearchSettled()

  const [inputValue, setInputValue] = useState(query)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const hasInput = Boolean(inputValue.trim())
  const isPending = inputValue.trim() !== query.trim()
  const hasResults = Boolean(query.trim()) && items.length > 0

  return (
    <>
      <div className="flex items-center gap-x-3 border-b border-ink/20 px-4">
        <MagnifyingGlass className="shrink-0 text-ink/70" />
        <input
          type="search"
          value={inputValue}
          onChange={(event) => {
            setInputValue(event.target.value)
            refine(event.target.value)
          }}
          placeholder="Search products"
          aria-label="Search products"
          autoFocus
          className="txt-medium w-full bg-transparent py-4 text-ink outline-none placeholder:text-ink/70"
          data-testid="search-input"
        />
      </div>

      {/*
       * The results replace the panel without a navigation, so a screen reader
       * has nothing to follow. One polite status line says what happened: how
       * many products matched, that it is still searching, or that it failed.
       */}
      <p
        role="status"
        aria-live="polite"
        className="sr-only"
        data-testid="search-status"
      >
        {!hasInput
          ? "Type to search the catalogue."
          : status === "error"
            ? "Search failed."
            : !isSettled || isPending
              ? "Searching."
              : `${items.length} ${items.length === 1 ? "product" : "products"} found.`}
      </p>

      <div className="flex-1 overflow-y-auto">
        {!hasInput ? (
          <Text
            className="px-4 py-6 text-center text-ink/70"
            data-testid="search-empty"
          >
            Start typing to search for products.
          </Text>
        ) : status === "error" ? (
          <Text
            className="px-4 py-6 text-center text-ink"
            data-testid="search-error"
          >
            Couldn&apos;t search products
            {error?.message ? `: ${error.message}` : "."}
          </Text>
        ) : !isSettled ? (
          <Text
            className="px-4 py-6 text-center text-ink/70"
            data-testid="search-loading"
          >
            Searching&hellip;
          </Text>
        ) : hasResults ? (
          <ul className="py-2" data-testid="search-results">
            {items.map((hit) => (
              <SearchHit key={hit.objectID} hit={hit} onNavigate={onNavigate} />
            ))}
          </ul>
        ) : isPending || !query.trim() ? (
          <Text
            className="px-4 py-6 text-center text-ink/70"
            data-testid="search-loading"
          >
            Searching&hellip;
          </Text>
        ) : (
          <Text
            className="px-4 py-6 text-center text-ink/70"
            data-testid="search-no-results"
          >
            No products found for &quot;{query}&quot;
          </Text>
        )}
      </div>
    </>
  )
}

/**
 * Everything the search drawer does once it is open: the InstantSearch state,
 * the client that talks to the search service, and the results list. Nothing
 * here is useful before a visitor opens the drawer, which is why this file is
 * loaded on demand by `Search` in ./index.tsx rather than imported directly.
 */
const SearchPanel = ({ onNavigate }: { onNavigate: () => void }) => {
  return (
    <InstantSearch
      indexName={PRODUCT_INDEX_NAME}
      searchClient={searchClient as unknown as SearchClient}
      future={{ preserveSharedStateOnUnmount: true }}
    >
      <Configure hitsPerPage={HITS_PER_PAGE} />
      <SearchResults onNavigate={onNavigate} />
    </InstantSearch>
  )
}

export default SearchPanel
