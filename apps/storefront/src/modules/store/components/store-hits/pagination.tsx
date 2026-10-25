"use client"

import clsx from "clsx"
import { usePagination } from "react-instantsearch"

/* usePagination keeps the page in the URL; InstantSearch owns the navigation. */
const SearchPagination = () => {
  const { pages, currentRefinement, nbPages, refine } = usePagination({
    padding: 2,
  })

  if (nbPages <= 1) {
    return null
  }

  const renderPage = (page: number) => {
    const isCurrent = page === currentRefinement

    return (
      <li key={page}>
        <button
          type="button"
          aria-label={`Page ${page + 1}`}
          aria-current={isCurrent ? "page" : undefined}
          disabled={isCurrent}
          onClick={() => refine(page)}
          className={clsx(
            "min-h-11 min-w-11 border border-transparent px-2 font-display text-lead",
            isCurrent
              ? "border-ink bg-ink text-stock"
              : "text-ink hover:border-ink"
          )}
        >
          {page + 1}
        </button>
      </li>
    )
  }

  const renderEllipsis = (key: string) => (
    <li
      key={key}
      aria-hidden="true"
      className="flex min-h-11 items-center px-1 text-ink/70"
    >
      …
    </li>
  )

  const lastPage = nbPages - 1

  return (
    <nav aria-label="Pagination" className="mt-12 w-full">
      <ul
        className="flex flex-wrap items-center justify-center gap-2"
        data-testid="product-pagination"
      >
        {!pages.includes(0) && renderPage(0)}
        {!pages.includes(0) && !pages.includes(1) && renderEllipsis("start")}
        {pages.map(renderPage)}
        {!pages.includes(lastPage) &&
          !pages.includes(lastPage - 1) &&
          renderEllipsis("end")}
        {!pages.includes(lastPage) && renderPage(lastPage)}
      </ul>
    </nav>
  )
}

export default SearchPagination
