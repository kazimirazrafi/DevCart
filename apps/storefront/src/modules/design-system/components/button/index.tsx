import clsx from "clsx"
import { ButtonHTMLAttributes, forwardRef } from "react"

export type ButtonVariant = "primary" | "secondary"
export type ButtonSize = "small" | "medium" | "large"

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Blocks the button and shows a spinner without shifting the layout. */
  loading?: boolean
}

/*
 * Colour choices are fixed by the contrast rules in docs/DESIGN.md §2.1:
 * `stock` on `riso-blue` is 4.53:1, so that pairing is the only blue fill.
 * `ink` is never placed on `riso-blue` (3.21:1).
 */
const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-riso-blue text-stock border border-riso-blue hover:bg-ink hover:border-ink " +
    "disabled:bg-riso-blue/40 disabled:border-transparent disabled:text-stock/80",
  secondary:
    "bg-transparent text-ink border border-ink hover:bg-ink hover:text-stock " +
    "disabled:border-ink/30 disabled:text-ink/40 disabled:hover:bg-transparent disabled:hover:text-ink/40",
}

const SIZES: Record<ButtonSize, string> = {
  small: "h-9 px-3 text-small",
  medium: "h-11 px-5 text-body",
  large: "h-14 px-7 text-lead",
}

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-square font-sans font-semibold " +
  "transition-colors duration-150 disabled:cursor-not-allowed"

/**
 * The button look as a class string, for the places that need a button-shaped
 * *link* (`<a>` inside `<button>` is invalid markup). `Button` itself is built
 * from this, so a link styled with it cannot drift from the real button.
 */
export const buttonClass = ({
  className,
  variant = "primary",
  size = "medium",
}: {
  className?: string
  variant?: ButtonVariant
  size?: ButtonSize
} = {}) => clsx(BASE, VARIANTS[variant], SIZES[size], className)

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "medium", loading, disabled, children, ...props },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={props.type ?? "button"}
        // aria-busy tells assistive tech the action is running; `disabled` alone
        // just looks inert.
        aria-busy={loading || undefined}
        disabled={disabled || loading}
        className={buttonClass({ variant, size, className })}
        {...props}
      >
        {loading && (
          <span
            aria-hidden="true"
            className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
          />
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = "Button"
