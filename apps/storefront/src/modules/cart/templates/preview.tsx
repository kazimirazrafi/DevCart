"use client"

import repeat from "@lib/util/repeat"
import { HttpTypes } from "@medusajs/types"
import clsx from "clsx"

import Item from "@modules/cart/components/item"

type ItemsPreviewTemplateProps = {
  cart: HttpTypes.StoreCart
}

/** Placeholder line shown only if the cart has not resolved yet. */
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

/**
 * The checkout summary's lines. A list, not a table: each line renders as a
 * list item, and a `<tbody>` may only contain rows — the previous markup nested
 * `<li>` inside `<tbody>`, which the browser's parser hoists out of the table
 * and which React reported as a hydration mismatch on every checkout page.
 */
const ItemsPreviewTemplate = ({ cart }: ItemsPreviewTemplateProps) => {
  const items = cart.items
  const hasOverflow = items && items.length > 4

  return (
    <div
      className={clsx({
        "no-scrollbar max-h-[420px] overflow-y-scroll overflow-x-hidden pl-[1px]":
          hasOverflow,
      })}
    >
      <ul className="flex flex-col" data-testid="items-table">
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
                  type="preview"
                  currencyCode={cart.currency_code}
                />
              ))
          : repeat(5).map((index) => <SkeletonRow key={index} />)}
      </ul>
    </div>
  )
}

export default ItemsPreviewTemplate
