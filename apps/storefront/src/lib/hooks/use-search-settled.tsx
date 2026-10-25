"use client"

import { useInstantSearch } from "react-instantsearch"

/**
 * Whether the results belong to the current query. Until they do, `items` still
 * holds the previous search's hits. `__isArtificial` is InstantSearch's own flag
 * for placeholder results, and is missing from the public types.
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
