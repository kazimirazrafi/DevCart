"use client"

import * as Slider from "@radix-ui/react-slider"
import { useEffect, useState } from "react"
import { useRange } from "react-instantsearch"

import { indexedCurrency, priceAttribute } from "@lib/search-client"

function formatAmount(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.toUpperCase(),
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    // An unrecognised currency code shouldn't take the sidebar down.
    return `${Math.round(amount)} ${currency.toUpperCase()}`
  }
}

/*
 * Bounds come from the facet's stats. Refines on release, and hides itself when
 * there is nothing to slide between.
 */
const PriceRange = ({ currencyCode }: { currencyCode: string }) => {
  const { start, range, canRefine, refine } = useRange({
    attribute: priceAttribute("min_price", currencyCode),
  })
  const currency = indexedCurrency(currencyCode)
  const format = (amount: number) => formatAmount(amount, currency)

  const min = Math.floor(range.min ?? 0)
  const max = Math.ceil(range.max ?? 0)

  // `start` holds ±Infinity for an unset bound, so fall back to the extremes.
  const from = Number.isFinite(start[0]) ? (start[0] as number) : min
  const to = Number.isFinite(start[1]) ? (start[1] as number) : max

  const [value, setValue] = useState<number[]>([from, to])

  // Follow the refinement when it changes elsewhere, e.g. Clear all or the URL.
  useEffect(() => {
    setValue([from, to])
  }, [from, to])

  if (!canRefine || min >= max) {
    return null
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-small font-semibold text-ink">Price</span>

      <div className="flex flex-col gap-3 pt-2">
        <Slider.Root
          className="relative flex h-5 w-full touch-none select-none items-center"
          value={value}
          min={min}
          max={max}
          step={1}
          minStepsBetweenThumbs={0}
          onValueChange={setValue}
          // Refine on release, not on every pixel dragged.
          onValueCommit={(committed) => refine([committed[0], committed[1]])}
          aria-label="Price range"
          data-testid="price-range"
        >
          <Slider.Track className="relative h-0.5 w-full grow bg-ink/20">
            <Slider.Range className="absolute h-full bg-riso-blue" />
          </Slider.Track>
          {value.map((_, index) => (
            <Slider.Thumb
              key={index}
              className="block h-4 w-4 border border-ink bg-stock outline-none"
              aria-label={index === 0 ? "Minimum price" : "Maximum price"}
            />
          ))}
        </Slider.Root>

        <div className="flex items-center justify-between font-mono text-micro text-ink/70">
          <span>{format(value[0])}</span>
          <span>{format(value[1])}</span>
        </div>
      </div>
    </div>
  )
}

export default PriceRange
