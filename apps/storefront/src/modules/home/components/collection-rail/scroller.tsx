"use client"

import { useCallback, useEffect, useRef, useState } from "react"

type Edges = {
  atStart: boolean
  atEnd: boolean
}

const Arrow = ({ direction }: { direction: "left" | "right" }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    className="h-4 w-4"
  >
    {direction === "left" ? (
      <path d="M14 8H2M2 8l5-5M2 8l5 5" />
    ) : (
      <path d="M2 8h12M14 8l-5-5M14 8l-5 5" />
    )}
  </svg>
)

/**
 * The sideways scroller for a product rail.
 *
 * A phone swipes the row and needs nothing more, but a mouse does not
 * discover a horizontal overflow — the products past the edge simply look
 * missing. Two buttons appear at `small` and up and move the row by most of a
 * screen; they disable at the ends so the control matches what is possible.
 *
 * The list itself stays a server-rendered child: this wrapper owns only the
 * scroll position, so no product card becomes client-side JavaScript.
 */
export default function RailScroller({
  children,
  label,
}: {
  children: React.ReactNode
  label: string
}) {
  const viewport = useRef<HTMLDivElement>(null)
  // Both disabled until the first measurement, so a short row never flashes an
  // enabled button.
  const [edges, setEdges] = useState<Edges>({ atStart: true, atEnd: true })

  const measure = useCallback(() => {
    const element = viewport.current

    if (!element) {
      return
    }

    setEdges({
      atStart: element.scrollLeft <= 2,
      atEnd:
        element.scrollLeft + element.clientWidth >= element.scrollWidth - 2,
    })
  }, [])

  useEffect(() => {
    measure()

    const element = viewport.current

    if (!element) {
      return
    }

    // The row grows when its images finish loading, which changes the far edge
    // without a scroll event; observing both boxes catches that.
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    if (element.firstElementChild) {
      observer.observe(element.firstElementChild)
    }

    window.addEventListener("resize", measure)

    return () => {
      observer.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [measure])

  const scroll = (direction: 1 | -1) => {
    const element = viewport.current

    if (!element) {
      return
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches

    element.scrollBy({
      left: direction * Math.max(element.clientWidth * 0.8, 240),
      behavior: reduceMotion ? "auto" : "smooth",
    })
  }

  const buttonClass =
    "inline-flex h-11 w-11 items-center justify-center border border-ink text-ink transition-colors hover:bg-ink hover:text-stock disabled:cursor-not-allowed disabled:border-ink/30 disabled:text-ink/40 disabled:hover:bg-transparent disabled:hover:text-ink/40"

  return (
    <div>
      <div
        ref={viewport}
        onScroll={measure}
        className="-mx-1 overflow-x-auto px-1 pb-1"
      >
        {children}
      </div>

      <div className="mt-4 hidden items-center justify-end gap-2 small:flex">
        <button
          type="button"
          onClick={() => scroll(-1)}
          disabled={edges.atStart}
          aria-label={`Scroll ${label} left`}
          className={buttonClass}
          data-testid="rail-prev"
        >
          <Arrow direction="left" />
        </button>
        <button
          type="button"
          onClick={() => scroll(1)}
          disabled={edges.atEnd}
          aria-label={`Scroll ${label} right`}
          className={buttonClass}
          data-testid="rail-next"
        >
          <Arrow direction="right" />
        </button>
      </div>
    </div>
  )
}
