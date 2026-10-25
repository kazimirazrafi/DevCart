"use client"

import * as Accordion from "@radix-ui/react-accordion"
import { ChevronDownMini } from "@medusajs/icons"
import clsx from "clsx"
import { useState } from "react"
import { useRefinementList } from "react-instantsearch"

import { OPTION_VALUES_ATTRIBUTE } from "./attributes"

const FACET_LIMIT = 200

type OptionGroup = {
  title: string
  values: {
    label: string
    value: string
    count: number
    isRefined: boolean
  }[]
}

function groupItems(
  items: ReturnType<typeof useRefinementList>["items"]
): OptionGroup[] {
  const groups = new Map<string, OptionGroup>()

  for (const item of items) {
    const separator = item.label.indexOf(":")

    if (separator < 1) {
      continue
    }

    const title = item.label.slice(0, separator)
    const label = item.label.slice(separator + 1)

    if (!groups.has(title)) {
      groups.set(title, { title, values: [] })
    }

    groups.get(title)!.values.push({
      label,
      value: item.value,
      count: item.count,
      isRefined: item.isRefined,
    })
  }

  return Array.from(groups.values())
}

/** Size, colour and any other option as collapsible chip groups. */
const OptionRefinements = () => {
  const { items, refine } = useRefinementList({
    attribute: OPTION_VALUES_ATTRIBUTE,
    limit: FACET_LIMIT,
    // Alphabetical keeps a size or colour list stable as counts move around.
    sortBy: ["name:asc"],
    operator: "and",
  })
  const [closedGroups, setClosedGroups] = useState<string[]>([])

  const groups = groupItems(items)

  if (!groups.length) {
    return null
  }

  return (
    <Accordion.Root
      type="multiple"
      value={groups
        .map((group) => group.title)
        .filter((title) => !closedGroups.includes(title))}
      onValueChange={(openTitles) =>
        setClosedGroups(
          groups
            .map((group) => group.title)
            .filter((title) => !openTitles.includes(title))
        )
      }
      className="flex flex-col"
    >
      {groups.map((group) => {
        const isOpen = !closedGroups.includes(group.title)
        const selectedCount = group.values.filter(
          (value) => value.isRefined
        ).length

        return (
          <Accordion.Item
            key={group.title}
            value={group.title}
            className="overflow-hidden border-b border-ink/10"
          >
            {/* Radix renders an h3 by default; the page needs an h2 here. */}
            <Accordion.Header asChild>
              <h2>
                <Accordion.Trigger className="flex w-full items-center justify-between py-2 text-left">
                  <span className="flex items-center gap-2 text-small font-semibold text-ink">
                    {group.title}
                    <span className="font-mono text-micro text-ink/70">
                      {selectedCount}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={clsx(
                      "flex h-6 w-6 items-center justify-center text-ink/70 transition-transform duration-150 motion-reduce:transition-none",
                      { "rotate-180": isOpen }
                    )}
                  >
                    <ChevronDownMini />
                  </span>
                </Accordion.Trigger>
              </h2>
            </Accordion.Header>
            <Accordion.Content className="pb-4 pt-1">
              <div className="flex flex-wrap gap-2">
                {group.values.map((value) => (
                  <button
                    key={value.value}
                    type="button"
                    onClick={() => refine(value.value)}
                    aria-pressed={value.isRefined}
                    className={clsx(
                      "flex min-h-11 items-center gap-1.5 border px-3 text-small transition-colors",
                      value.isRefined
                        ? "border-ink bg-ink text-stock"
                        : "border-ink/40 text-ink hover:border-ink"
                    )}
                    data-testid="option-refinement"
                  >
                    {value.label}
                    <span
                      className={clsx(
                        "font-mono text-micro",
                        value.isRefined ? "text-stock/80" : "text-ink/70"
                      )}
                    >
                      {value.count}
                    </span>
                  </button>
                ))}
              </div>
            </Accordion.Content>
          </Accordion.Item>
        )
      })}
    </Accordion.Root>
  )
}

export default OptionRefinements
