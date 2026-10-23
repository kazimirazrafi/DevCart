import { HttpTypes } from "@medusajs/types"

type LineItemOptionsProps = {
  variant: HttpTypes.StoreProductVariant | undefined
  "data-testid"?: string
  "data-value"?: HttpTypes.StoreProductVariant
}

/**
 * What was ordered about the variant — the option values joined into its title
 * ("M / Blue"). Printed plain, with no "Variant:" prefix: the value alone reads
 * as the choice, and a label for one short line is noise.
 */
const LineItemOptions = ({
  variant,
  "data-testid": dataTestid,
  "data-value": dataValue,
}: LineItemOptionsProps) => {
  if (!variant?.title) {
    return null
  }

  return (
    <p
      data-testid={dataTestid}
      data-value={dataValue}
      className="text-small text-ink/70"
    >
      {variant.title}
    </p>
  )
}

export default LineItemOptions
