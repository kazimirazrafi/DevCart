"use client"

import { ComputerDesktop, Moon, Sun } from "@medusajs/icons"
import clsx from "clsx"
import type { ElementType } from "react"

import useTheme from "@lib/hooks/use-theme"
import type { ThemePreference } from "@lib/theme"

type ThemeOption = {
  value: ThemePreference
  label: string
  Icon: ElementType
}

const OPTIONS: ThemeOption[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "Auto", Icon: ComputerDesktop },
]

type ThemeSwitcherProps = {
  className?: string
  variant?: "full" | "compact"
  tone?: "default" | "on-ink"
  /** Prefixes the test ids, so the header's copy and the panel's stay distinct. */
  testIdPrefix?: string
}

const ThemeSwitcher = ({
  className,
  variant = "full",
  tone = "default",
  testIdPrefix = "theme",
}: ThemeSwitcherProps) => {
  const { preference, setTheme } = useTheme()
  // Derived from the prefix, not useId: the header's copy and the side menu's
  // must stay in separate radio groups, and a generated id differed between the
  // server render and hydration, which React reports as an attribute mismatch.
  const groupName = `${testIdPrefix}-colour-theme`
  const onInk = tone === "on-ink"

  return (
    <div
      role="group"
      aria-label="Colour theme"
      className={clsx("flex items-center gap-3", className)}
      data-testid={`${testIdPrefix}-switcher`}
    >
      {variant === "full" && (
        <span
          aria-hidden="true"
          className={clsx("text-small", onInk ? "text-stock/70" : "text-ink/70")}
        >
          Colour
        </span>
      )}

      <div
        className={clsx(
          "inline-flex border",
          onInk ? "border-stock/50" : "border-ink"
        )}
      >
        {OPTIONS.map((option) => {
          const checked = preference === option.value

          return (
            <label
              key={option.value}
              title={variant === "compact" ? option.label : undefined}
              className={clsx(
                "relative flex cursor-pointer items-center border-l py-1.5 text-small font-semibold transition-colors first:border-l-0",
                variant === "compact" ? "px-2.5" : "px-3",
                onInk ? "border-stock/50" : "border-ink",
                "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-riso-blue",
                checked
                  ? onInk
                    ? "bg-stock text-ink"
                    : "bg-ink text-stock"
                  : onInk
                    ? "text-stock hover:bg-stock/10"
                    : "text-ink hover:bg-ink/10"
              )}
            >
              <input
                type="radio"
                name={groupName}
                value={option.value}
                checked={checked}
                onChange={() => setTheme(option.value)}
                className="sr-only"
                data-testid={`${testIdPrefix}-${option.value}`}
              />
              {variant === "compact" ? (
                <>
                  <option.Icon aria-hidden="true" className="h-4 w-4" />
                  <span className="sr-only">{option.label}</span>
                </>
              ) : (
                option.label
              )}
            </label>
          )
        })}
      </div>
    </div>
  )
}

export default ThemeSwitcher
