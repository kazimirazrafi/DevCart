import clsx from "clsx"
import { AnchorHTMLAttributes, forwardRef } from "react"

// Exported so `LocalizedClientLink` can carry the same look.
export const linkClass =
  "text-riso-blue underline decoration-1 underline-offset-4 " +
  "hover:text-ink hover:decoration-2 transition-colors duration-150"

export type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement>

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
