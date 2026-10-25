"use client"

import clsx from "clsx"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

/* Paging through a plain ?page= param, used by collections. */
export function Pagination({
  page,
  totalPages,
  "data-testid": dataTestid,
}: {
  page: number
  totalPages: number
  "data-testid"?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const arrayRange = (start: number, stop: number) =>
    Array.from({ length: stop - start + 1 }, (_, index) => start + index)

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams)
    params.set("page", newPage.toString())
    router.push(`${pathname}?${params.toString()}`)
  }

  const renderPageButton = (
    p: number,
    label: string | number,
    isCurrent: boolean
  ) => (
    <li key={p}>
      <button
        type="button"
        aria-label={`Page ${p}`}
        aria-current={isCurrent ? "page" : undefined}
        disabled={isCurrent}
        onClick={() => handlePageChange(p)}
        className={clsx(
          "min-h-11 min-w-11 border border-transparent px-2 font-display text-lead",
          isCurrent
            ? "border-ink bg-ink text-stock"
            : "text-ink hover:border-ink"
        )}
      >
        {label}
      </button>
    </li>
  )

  const renderEllipsis = (key: string) => (
    <li
      key={key}
      aria-hidden="true"
      className="flex min-h-11 items-center px-1 text-ink/70"
    >
      …
    </li>
  )

  const renderPageButtons = () => {
    const buttons = []

    if (totalPages <= 7) {
      buttons.push(
        ...arrayRange(1, totalPages).map((p) =>
          renderPageButton(p, p, p === page)
        )
      )
    } else {
      if (page <= 4) {
        buttons.push(
          ...arrayRange(1, 5).map((p) => renderPageButton(p, p, p === page))
        )
        buttons.push(renderEllipsis("ellipsis1"))
        buttons.push(
          renderPageButton(totalPages, totalPages, totalPages === page)
        )
      } else if (page >= totalPages - 3) {
        buttons.push(renderPageButton(1, 1, 1 === page))
        buttons.push(renderEllipsis("ellipsis2"))
        buttons.push(
          ...arrayRange(totalPages - 4, totalPages).map((p) =>
            renderPageButton(p, p, p === page)
          )
        )
      } else {
        buttons.push(renderPageButton(1, 1, 1 === page))
        buttons.push(renderEllipsis("ellipsis3"))
        buttons.push(
          ...arrayRange(page - 1, page + 1).map((p) =>
            renderPageButton(p, p, p === page)
          )
        )
        buttons.push(renderEllipsis("ellipsis4"))
        buttons.push(
          renderPageButton(totalPages, totalPages, totalPages === page)
        )
      }
    }

    return buttons
  }

  return (
    <nav aria-label="Pagination" className="mt-12 w-full">
      <ul
        className="flex flex-wrap items-center justify-center gap-2"
        data-testid={dataTestid}
      >
        {renderPageButtons()}
      </ul>
    </nav>
  )
}
