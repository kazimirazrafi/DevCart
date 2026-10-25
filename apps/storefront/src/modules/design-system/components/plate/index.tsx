import clsx from "clsx"
import { forwardRef, HTMLAttributes } from "react"

export type PlateProps = HTMLAttributes<HTMLElement> & {
  as?: "div" | "article" | "li"
}

const PlateRoot = forwardRef<HTMLElement, PlateProps>(
  ({ className, as = "article", children, ...props }, ref) => {
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

const PlateMedia = ({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={clsx("relative aspect-square w-full overflow-hidden bg-ink/5", className)}
    {...props}
  >
    {children}
  </div>
)

const PlateBody = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={clsx("flex flex-col gap-2 border-t border-ink p-4", className)} {...props} />
)

// break-words keeps a long product name inside a narrow plate.
const PlateTitle = ({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) => (
  <h3
    className={clsx(
      "break-words font-display text-lead font-semibold leading-tight text-ink",
      className
    )}
    {...props}
  />
)

const PlatePrice = ({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) => (
  <p className={clsx("font-mono text-small text-ink", className)} {...props} />
)

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
