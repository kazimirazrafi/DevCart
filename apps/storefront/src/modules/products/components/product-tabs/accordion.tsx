"use client"

import clsx from "clsx"
import React, { createContext, useContext, useMemo, useState } from "react"

/*
 * A plain disclosure list rather than Radix's Accordion. Radix generates the
 * trigger/content ids itself, and those ids drifted between the server render
 * and hydration on every product page — React logged "A tree hydrated but some
 * attributes … didn't match" with two different `radix-_R_…` ids for the same
 * node. The ids here come from the item's own value, so they are the same on
 * both sides, and `hidden` replaces the animation because a collapsed panel is
 * not something this page needed to animate.
 *
 * Only the product page's tabs use this component (the store filters have their
 * own refiner list), so the API is just what they need.
 */

type AccordionContextValue = {
  isOpen: (value: string) => boolean
  toggle: (value: string) => void
}

const AccordionContext = createContext<AccordionContextValue | null>(null)

const contentId = (value: string) =>
  `product-tab-${value.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`

type AccordionProps = {
  /** `multiple` lets every panel open at once; `single` keeps only one open. */
  type?: "single" | "multiple"
  defaultValue?: string[]
  children: React.ReactNode
  className?: string
}

const Accordion: React.FC<AccordionProps> & {
  Item: React.FC<AccordionItemProps>
} = ({ type = "single", defaultValue = [], children, className }) => {
  const [openValues, setOpenValues] = useState<string[]>(defaultValue)

  const context = useMemo<AccordionContextValue>(
    () => ({
      isOpen: (value) => openValues.includes(value),
      toggle: (value) =>
        setOpenValues((current) => {
          if (current.includes(value)) {
            return current.filter((open) => open !== value)
          }

          return type === "single" ? [value] : [...current, value]
        }),
    }),
    [openValues, type]
  )

  return (
    <AccordionContext.Provider value={context}>
      <div className={className}>{children}</div>
    </AccordionContext.Provider>
  )
}

type AccordionItemProps = {
  /** Identifies the panel; also the source of its element ids. */
  value: string
  title: string
  subtitle?: string
  description?: string
  children: React.ReactNode
  className?: string
}

/** Open marker: a plus that loses its upright stroke when the panel is open. */
const TriggerMark = ({ open }: { open: boolean }) => (
  <span aria-hidden="true" className="relative block h-4 w-4 shrink-0">
    <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-ink" />
    <span
      className={clsx(
        "absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-ink transition-opacity duration-200",
        open && "opacity-0"
      )}
    />
  </span>
)

const Item: React.FC<AccordionItemProps> = ({
  value,
  title,
  subtitle,
  description,
  children,
  className,
}) => {
  const accordion = useContext(AccordionContext)

  if (!accordion) {
    throw new Error("Accordion.Item has to be rendered inside an Accordion")
  }

  const open = accordion.isOpen(value)
  const panelId = contentId(value)

  return (
    <div
      className={clsx("border-t border-ink/20 last:border-b", className)}
      data-state={open ? "open" : "closed"}
    >
      {/*
       * `h2`, not `h3`: on the product page these panels are the first section
       * headings under the product's `h1`, and an `h3` there skipped a level.
       */}
      <h2>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => accordion.toggle(value)}
          className="group flex w-full items-center justify-between gap-4 py-4 text-left"
        >
          <span className="flex flex-col gap-1">
            <span className="text-small font-semibold text-ink">{title}</span>
            {subtitle && (
              <span className="text-small text-ink/70">{subtitle}</span>
            )}
          </span>
          <TriggerMark open={open} />
        </button>
      </h2>
      <div id={panelId} hidden={!open} className="pb-6">
        {description && <p className="text-small text-ink/80">{description}</p>}
        {children}
      </div>
    </div>
  )
}

Accordion.Item = Item

export default Accordion
