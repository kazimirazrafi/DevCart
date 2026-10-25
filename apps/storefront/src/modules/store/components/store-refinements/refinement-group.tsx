"use client"

import clsx from "clsx"
import { useRefinementList } from "react-instantsearch"

type RefinementGroupProps = {
  attribute: string
  title: string
}

/* Native checkboxes, so the state is announced and keyboard access comes free. */
const RefinementGroup = ({ attribute, title }: RefinementGroupProps) => {
  const { items, refine } = useRefinementList({
    attribute,
    limit: 20,
    sortBy: ["count:desc", "name:asc"],
  })

  if (!items.length) {
    return null
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="pb-1 text-small font-semibold text-ink">
        {title}
      </legend>
      <ul className="flex flex-col">
        {items.map((item) => (
          <li key={item.value} className="border-b border-ink/10">
            <label className="flex cursor-pointer items-center gap-2 py-2 text-small">
              <input
                type="checkbox"
                checked={item.isRefined}
                onChange={() => refine(item.value)}
                className="h-4 w-4 shrink-0 accent-riso-blue"
                data-testid={`refinement-${attribute}`}
              />
              <span
                className={clsx(
                  "min-w-0 flex-1 break-words",
                  item.isRefined ? "font-semibold text-ink" : "text-ink/80"
                )}
              >
                {item.label}
              </span>
              <span className="shrink-0 font-mono text-micro text-ink/70">
                {item.count}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  )
}

export default RefinementGroup
