import clsx from "clsx"
import React from "react"

import { HttpTypes } from "@medusajs/types"

type OptionSelectProps = {
  option: HttpTypes.StoreProductOption
  current: string | undefined
  updateOption: (title: string, value: string) => void
  title: string
  disabled: boolean
  "data-testid"?: string
}

/*
 * A group of options (Size, Colour) as square chips. `aria-pressed` carries the
 * selection so it is not communicated by border colour alone.
 */
const OptionSelect: React.FC<OptionSelectProps> = ({
  option,
  current,
  updateOption,
  title,
  "data-testid": dataTestId,
  disabled,
}) => {
  const filteredOptions = (option.values ?? []).map((v) => v.value)

  return (
    <fieldset className="flex flex-col gap-2" data-testid={dataTestId}>
      <legend className="pb-1 text-small font-semibold text-ink">{title}</legend>
      <div className="flex flex-wrap gap-2">
        {filteredOptions.map((v) => {
          const isSelected = v === current

          return (
            <button
              key={v}
              type="button"
              onClick={() => updateOption(option.id, v)}
              aria-pressed={isSelected}
              disabled={disabled}
              className={clsx(
                "min-h-11 min-w-12 border px-3 text-small font-semibold transition-colors",
                isSelected
                  ? "border-ink bg-ink text-stock"
                  : "border-ink/40 bg-stock text-ink hover:border-ink",
                disabled && "cursor-not-allowed opacity-60"
              )}
              data-testid="option-button"
            >
              {v}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

export default OptionSelect
