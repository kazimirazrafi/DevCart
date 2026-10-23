import clsx from "clsx"
import { forwardRef, HTMLAttributes } from "react"

/*
 * A plate is the shell every product appears in: a square, hairline-bordered
 * block with no shadow and no rounding. Registration marks and overprint are
 * deferred polish (docs/DESIGN.md §5.1) — a plate must look finished without them.
 */
export type PlateProps = HTMLAttributes<HTMLElement> & {
  as?: "div" | "article" | "li"
}

const PlateRoot = forwardRef<HTMLElement, PlateProps>(
  ({ className, as = "article", children, ...props }, ref) => {
    // `as` lets a plate be a grid item (`li`) or a standalone block without
    // duplicating the styling; ElementType keeps the ref valid across both.
    const Component = as as React.ElementType

    return (
      <Component
        ref={ref}
        className={clsx(
          "relative flex w-full flex-col rounded-square border border-ink bg-stock",
          className
        )}
        {...props}
      >
        {children}
      </Component>
    )
  }
)
PlateRoot.displayName = "Plate"

/** Fixed-ratio image well. Keeps every plate in a grid the same height. */
const PlateMedia = ({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={clsx("relative aspect-square w-full overflow-hidden bg-ink/5", className)}
    {...props}
  >
    {children}
  </div>
)

/** Text block below the media. */
const PlateBody = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={clsx("flex flex-col gap-2 border-t border-ink p-4", className)} {...props} />
)

/**
 * Product name. Display voice, sentence case. `break-words` keeps a long
 * single word ("Coffee-Driven") inside a narrow two-up plate on a phone
 * instead of pushing past the plate edge.
 */
const PlateTitle = ({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) => (
  <h3
    className={clsx(
      "break-words font-display text-lead font-semibold leading-tight text-ink",
      className
    )}
    {...props}
  />
)

/** Price. Mono, because it is machine data and must align across a grid. */
const PlatePrice = ({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) => (
  <p className={clsx("font-mono text-small text-ink", className)} {...props} />
)

/** Secondary facts: stock state, SKU, material. */
const PlateMeta = ({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) => (
  <p className={clsx("text-small text-ink", className)} {...props} />
)

export const Plate = Object.assign(PlateRoot, {
  Media: PlateMedia,
  Body: PlateBody,
  Title: PlateTitle,
  Price: PlatePrice,
  Meta: PlateMeta,
})
