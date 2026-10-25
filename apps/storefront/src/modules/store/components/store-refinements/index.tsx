"use client"

import clsx from "clsx"
import { useEffect, useRef, useState } from "react"
import { useCurrentRefinements, useSortBy } from "react-instantsearch"

import FilterRadioGroup from "@modules/common/components/filter-radio-group"
import { Button } from "@modules/design-system"
import {
  CATEGORY_ATTRIBUTE,
  LABELS_ATTRIBUTE,
  getSortOptions,
} from "./attributes"
import CurrentRefinements from "./current-refinements"
import OnSaleToggle from "./on-sale-toggle"
import OptionRefinements from "./option-refinements"
import PriceRange from "./price-range"
import RefinementGroup from "./refinement-group"

const SortProducts = ({ currencyCode }: { currencyCode: string }) => {
  const items = getSortOptions(currencyCode)
  const { currentRefinement, refine } = useSortBy({ items })

  return (
    <FilterRadioGroup
      title="Sort by"
      items={items}
      value={currentRefinement}
      handleChange={refine}
      data-testid="sort-by-container"
    />
  )
}

/*
 * Desktop: one column beside the grid. Phone: the same groups behind a Filters
 * drawer. Both read the same InstantSearch state, so the URL carries it either way.
 */
const StoreRefinements = ({
  currencyCode,
  hideCategoryFacet = false,
}: {
  currencyCode: string
  hideCategoryFacet?: boolean
}) => {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  const { items } = useCurrentRefinements()
  const activeCount = items.reduce(
    (total, item) => total + item.refinements.length,
    0
  )

  /* Escape closes the panel and returns focus to the trigger. */
  useEffect(() => {
    if (!open) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener("keydown", onKeyDown)

    // Move focus into the panel that just opened.
    panelRef.current
      ?.querySelector<HTMLElement>("button, a, input")
      ?.focus()

    return () => document.removeEventListener("keydown", onKeyDown)
  }, [open])

  const close = () => {
    setOpen(false)
    triggerRef.current?.focus()
  }

  return (
    <>
      {/* Fixed height: shrinking this bar moved the products below it. */}
      <div
        className="flex min-h-14 items-center justify-between gap-4 small:hidden"
        data-testid="store-filters-bar"
      >
        <Button
          ref={triggerRef}
          type="button"
          variant="secondary"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="store-filters-panel"
          data-testid="open-filters-button"
        >
          Filters
          {activeCount > 0 ? (
            <span
              aria-hidden="true"
              className="font-mono text-small"
              data-testid="active-filter-count"
            >
              {activeCount}
            </span>
          ) : null}
        </Button>

        <span className="text-small text-ink/70" data-testid="filters-summary">
          {activeCount > 0
            ? `${activeCount} filter${activeCount === 1 ? "" : "s"} applied`
            : "No filters applied"}
        </span>
      </div>

      {open ? (
        <div
          aria-hidden="true"
          className="fixed inset-x-0 bottom-0 top-16 z-40 bg-ink/40 small:hidden"
          onClick={close}
          data-testid="filters-backdrop"
        />
      ) : null}

      <aside
        id="store-filters-panel"
        ref={panelRef}
        aria-label="Sort and filter"
        aria-labelledby={open ? "store-filters-heading" : undefined}
        role={open ? "dialog" : undefined}
        aria-modal={open ? true : undefined}
        className={clsx(
          "flex-col gap-6 divide-y divide-ink/20",
          "small:static small:z-auto small:flex small:w-[260px] small:shrink-0 small:overflow-visible small:bg-transparent small:p-0",
          open
            ? "fixed inset-x-0 bottom-0 top-16 z-50 flex overflow-y-auto bg-stock p-6"
            : "hidden"
        )}
        data-testid="store-filters-panel"
      >
        <div className="flex items-center justify-between gap-4 small:hidden">
          <h2
            id="store-filters-heading"
            className="font-display text-lead font-semibold text-ink"
          >
            Filters
          </h2>
          <Button
            type="button"
            variant="secondary"
            size="small"
            onClick={close}
            data-testid="close-filters-button"
          >
            Done
          </Button>
        </div>

        <SortProducts currencyCode={currencyCode} />
        <div className="pt-6">
          <CurrentRefinements currencyCode={currencyCode} />
        </div>
        <div className="flex flex-col gap-6 pt-6">
          <OptionRefinements />
          <PriceRange currencyCode={currencyCode} />
          <OnSaleToggle currencyCode={currencyCode} />
          {hideCategoryFacet ? null : (
            <RefinementGroup attribute={CATEGORY_ATTRIBUTE} title="Category" />
          )}
          <RefinementGroup attribute={LABELS_ATTRIBUTE} title="Labels" />
        </div>
      </aside>
    </>
  )
}

export default StoreRefinements
