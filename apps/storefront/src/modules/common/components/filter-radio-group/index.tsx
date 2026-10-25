import clsx from "clsx"

type FilterRadioGroupProps = {
  title: string
  items: {
    value: string
    label: string
  }[]
  value: string
  handleChange: (value: string) => void
  "data-testid"?: string
}

// Native radios; the selected row is bold as well as coloured.
const FilterRadioGroup = ({
  title,
  items,
  value,
  handleChange,
  "data-testid": dataTestId,
}: FilterRadioGroupProps) => {
  return (
    <fieldset className="flex flex-col gap-2" data-testid={dataTestId}>
      <legend className="pb-1 text-small font-semibold text-ink">{title}</legend>
      {items.map((item) => {
        const isSelected = item.value === value
        const id = `${title}-${item.value}`.replace(/[^a-zA-Z0-9]+/g, "-")

        return (
          <label
            key={item.value}
            htmlFor={id}
            data-testid="radio-label"
            data-active={isSelected}
            className={clsx(
              "flex cursor-pointer items-center gap-2 py-1 text-small",
              isSelected
                ? "font-semibold text-ink"
                : "text-ink/70 hover:text-ink"
            )}
          >
            <input
              id={id}
              type="radio"
              name={title}
              value={item.value}
              checked={isSelected}
              onChange={() => handleChange(item.value)}
              className="h-4 w-4 shrink-0 accent-riso-blue"
              data-testid="sort-option"
            />
            {item.label}
          </label>
        )
      })}
    </fieldset>
  )
}

export default FilterRadioGroup
