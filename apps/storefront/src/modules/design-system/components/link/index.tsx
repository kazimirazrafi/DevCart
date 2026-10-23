import clsx from "clsx"
import { AnchorHTMLAttributes, forwardRef } from "react"

/*
 * The link treatment, in one place. `riso-blue` on `stock` is 4.53:1, so it is
 * safe for inline text at any size (docs/DESIGN.md §2.1).
 *
 * The storefront navigates internally with `LocalizedClientLink`, which already
 * owns country-aware routing. Rather than replace it, export `linkClass` so a
 * localized link can carry the same look: `<LocalizedClientLink className={linkClass} />`.
 */
export const linkClass =
  "text-riso-blue underline decoration-1 underline-offset-4 " +
  "hover:text-ink hover:decoration-2 transition-colors duration-150"

export type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement>

/**
 * A presentational link. Use it for external hrefs and for markup that is not a
 * route; use `LocalizedClientLink` with `linkClass` for in-store navigation.
 */
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <a ref={ref} className={clsx(linkClass, className)} {...props}>
        {children}
      </a>
    )
  }
)

Link.displayName = "Link"
