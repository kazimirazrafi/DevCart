import repeat from "@lib/util/repeat"
import { HttpTypes } from "@medusajs/types"

import Item from "@modules/cart/components/item"

type ItemsTemplateProps = {
  cart?: HttpTypes.StoreCart
  availability?: Record<string, number | null>
}

const SkeletonRow = () => (
  <li
    className="flex gap-4 border-b border-ink/20 py-6"
    data-testid="cart-item-loader"
  >
    <div className="h-20 w-20 shrink-0 animate-pulse bg-ink/10 small:h-24 small:w-24" />
    <div className="flex flex-1 flex-col gap-3">
      <div className="h-4 w-40 animate-pulse bg-ink/10" />
      <div className="h-4 w-24 animate-pulse bg-ink/10" />
      <div className="h-4 w-20 animate-pulse bg-ink/10" />
    </div>
  </li>
)

const ItemsTemplate = ({ cart, availability = {} }: ItemsTemplateProps) => {
  const items = cart?.items
  const currencyCode = cart?.currency_code ?? ""

  return (
    <ul className="flex flex-col border-t border-ink/20" data-testid="cart-items">
      {items
        ? items
            .slice()
            .sort((a, b) => {
              return (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1
            })
            .map((item) => (
              <Item
                key={item.id}
                item={item}
                currencyCode={currencyCode}
                availableUnits={
                  item.variant_id && item.variant_id in availability
                    ? availability[item.variant_id]
                    : undefined
                }
              />
            ))
        : repeat(5).map((index) => <SkeletonRow key={index} />)}
    </ul>
  )
}

export default ItemsTemplate
