import { HttpTypes } from "@medusajs/types"

import LineItemOptions from "@modules/common/components/line-item-options"
import LineItemPrice from "@modules/common/components/line-item-price"
import LineItemUnitPrice from "@modules/common/components/line-item-unit-price"
import Thumbnail from "@modules/products/components/thumbnail"

type ItemProps = {
  item: HttpTypes.StoreCartLineItem | HttpTypes.StoreOrderLineItem
  currencyCode: string
}

/*
 * A table row, because its caller renders it inside a `<tbody>`: anything else
 * would be hoisted out of the table by the HTML parser.
 */
const Item = ({ item, currencyCode }: ItemProps) => {
  return (
    <tr
      className="w-full border-b border-ink/20"
      data-testid="product-row"
    >
      <td className="w-24 p-4 pl-0 align-top">
        <div className="flex w-16">
          <Thumbnail thumbnail={item.thumbnail} size="square" />
        </div>
      </td>

      <td className="align-middle text-left">
        <p className="text-small font-semibold text-ink" data-testid="product-name">
          {item.product_title}
        </p>
        <LineItemOptions variant={item.variant} data-testid="product-variant" />
      </td>

      <td className="align-middle pr-0">
        <span className="flex flex-col items-end justify-center pr-0">
          <span className="flex items-baseline gap-x-1">
            <span className="text-small text-ink/70">
              <span data-testid="product-quantity">{item.quantity}</span>x{" "}
            </span>
            <LineItemUnitPrice
              item={item}
              style="tight"
              currencyCode={currencyCode}
            />
          </span>

          <LineItemPrice
            item={item}
            style="tight"
            currencyCode={currencyCode}
          />
        </span>
      </td>
    </tr>
  )
}

export default Item
