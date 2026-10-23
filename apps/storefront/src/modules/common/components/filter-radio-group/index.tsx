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

/*
 * A titled set of mutually exclusive choices — the listing's sort order. Native
 * radios keep keyboard and screen-reader behaviour, and the selected row is
 * marked with weight as well as colour so it does not rely on either alone.
 */
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
