import clsx from "clsx"
import { forwardRef, InputHTMLAttributes } from "react"

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  /** Required: the label is associated with the field through this id. */
  id: string
  label: string
  /** Guidance shown below the field when there is no error. */
  hint?: string
  /**
   * Error message. Rendered in ink, not pink: `riso-pink` is 3.13:1 on `stock`
   * (docs/DESIGN.md §2.1) so it may only mark, never carry words. The pink
   * border is the marker; this text says what went wrong.
   */
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, id, label, hint, error, disabled, ...props }, ref) => {
    const hintId = hint ? `${id}-hint` : undefined
    const errorId = error ? `${id}-error` : undefined
    const describedBy = errorId ?? hintId

    return (
      <div className="flex flex-col gap-2">
        <label htmlFor={id} className="text-small font-semibold text-ink">
          {label}
        </label>

        <input
          ref={ref}
          id={id}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={clsx(
            "h-11 w-full rounded-square border bg-stock px-3 text-body text-ink",
            "placeholder:text-ink/70",
            "disabled:cursor-not-allowed disabled:border-ink/30 disabled:bg-ink/5 disabled:text-ink/40",
            error ? "border-riso-pink" : "border-ink",
            className
          )}
          {...props}
        />

        {hint && !error && (
          <p id={hintId} className="text-small text-ink">
            {hint}
          </p>
        )}

        {error && (
          <p id={errorId} className="text-small text-ink">
            {error}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = "Input"
