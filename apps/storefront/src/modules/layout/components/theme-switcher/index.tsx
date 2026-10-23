"use client"

import { ComputerDesktop, Moon, Sun } from "@medusajs/icons"
import clsx from "clsx"
import { useId, type ElementType } from "react"

import useTheme from "@lib/hooks/use-theme"
import type { ThemePreference } from "@lib/theme"

/*
 * Native radios rather than buttons: a radio group is what this is (one of
 * three, always one chosen), arrow keys move between the options for free, and
 * a screen reader announces "2 of 3" without any role juggling. The inputs are
 * visually hidden and the label carries the look; the focus ring is drawn on the
 * label because the input itself is 1px.
 *
 * The look is the design system's own: hairline segments, the chosen one filled
 * with ink and set in stock, which inverts correctly in dark mode because both
 * are tokens. `on-ink` is for the menu panel, whose ground is the ink itself,
 * so the hairline and the unselected label have to be stock instead.
 *
 * Two shapes of the same control:
 * - `full` — the three words, used in the panel where there is room for them.
 * - `compact` — the same three choices as icons, for the header, which is
 *   where a visitor looks first and where the width is shared with the cart.
 *
 * Both can be on screen at once (the header's and, with the panel open, the
 * panel's), so the radio group's name comes from `useId` rather than being a
 * constant: one name for both would make them a single group with two controls.
 */

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
  const groupName = useId()
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
              /* The header's copy is icons only, so the word is also a tooltip. */
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
