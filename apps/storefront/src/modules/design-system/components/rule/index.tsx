import clsx from "clsx"
import { forwardRef, HTMLAttributes } from "react"

export type RuleProps = HTMLAttributes<HTMLHRElement> & {
  /** `hairline` is the default divider; `heavy` closes a band. */
  weight?: "hairline" | "heavy"
}

/**
 * A horizontal rule is real structure in this design — it separates bands and
 * closes plates — so it always uses the ink plate, never a tinted grey.
 */
export const Rule = forwardRef<HTMLHRElement, RuleProps>(
  ({ className, weight = "hairline", ...props }, ref) => {
    return (
      <hr
        ref={ref}
        className={clsx(
          "w-full border-0 border-t border-solid border-ink",
          weight === "heavy" && "border-t-2",
          className
        )}
        {...props}
      />
    )
  }
)

Rule.displayName = "Rule"
