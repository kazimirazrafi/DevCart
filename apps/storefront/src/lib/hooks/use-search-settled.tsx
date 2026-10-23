"use client"

import { useInstantSearch } from "react-instantsearch"

/**
 * Whether the results InstantSearch is holding belong to the current query and
 * refinements. Until they do, `items` still carries the previous search's hits,
 * so rendering them shows stale products for a moment.
 *
 * `__isArtificial` is the flag InstantSearch puts on the placeholder results it
 * renders before its first response. It isn't part of the public types — hence
 * the cast — but it's the library's own signal, used the same way inside
 * `connectInfiniteHits`. Absent results (`results` undefined) mean the same
 * thing and happen on the server, where the query has not run yet: without that
 * case the first paint is the "No products matched" line and the twelve plates
 * that replace it are the listing's entire layout shift.
 */
export function useSearchSettled() {
  const { status, results } = useInstantSearch()

  const isSearching = status !== "idle" && status !== "error"
  const hasNoResultsYet =
    !results ||
    Boolean(
      (results as unknown as { __isArtificial?: boolean }).__isArtificial
    )

  return {
    isSearching,
    hasNoResultsYet,
    isSettled: !isSearching && !hasNoResultsYet,
  }
}

export default useSearchSettled
