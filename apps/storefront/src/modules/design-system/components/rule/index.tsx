import clsx from "clsx"
import { forwardRef, HTMLAttributes } from "react"

export type RuleProps = HTMLAttributes<HTMLHRElement> & {
  /** `hairline` is the default divider; `heavy` closes a band. */
  weight?: "hairline" | "heavy"
}

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
