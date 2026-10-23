"use client"

import { convertToLocale } from "@lib/util/money"
import { Rule } from "@modules/design-system"
import React from "react"

type CartTotalsProps = {
  totals: {
    total?: number | null
    subtotal?: number | null
    tax_total?: number | null
    currency_code: string
    item_subtotal?: number | null
    shipping_subtotal?: number | null
    discount_total?: number | null
  }
}

/**
 * The money breakdown, shared by the cart, checkout and order pages. Amounts are
 * mono so the columns line up down the page — this is machine data, which is
 * exactly what docs/DESIGN.md reserves the mono face for.
 */
const CartTotals: React.FC<CartTotalsProps> = ({ totals }) => {
  const {
    currency_code,
    total,
    tax_total,
    item_subtotal,
    shipping_subtotal,
    discount_total,
  } = totals

  const amount = (value?: number | null) =>
    convertToLocale({ amount: value ?? 0, currency_code })

  return (
    <div data-testid="cart-totals">
      <dl className="flex flex-col gap-2 text-small text-ink">
        <div className="flex items-center justify-between gap-4">
          <dt>Subtotal (excl. shipping and taxes)</dt>
          <dd className="font-mono" data-testid="cart-subtotal" data-value={item_subtotal || 0}>
            {amount(item_subtotal)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt>Shipping</dt>
          <dd className="font-mono" data-testid="cart-shipping" data-value={shipping_subtotal || 0}>
            {amount(shipping_subtotal)}
          </dd>
        </div>
        {discount_total ? (
          <div className="flex items-center justify-between gap-4">
            <dt>Discount</dt>
            <dd
              className="font-mono text-riso-green"
              data-testid="cart-discount"
              data-value={discount_total || 0}
            >
              -{amount(Math.abs(discount_total))}
            </dd>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-4">
          <dt>Taxes</dt>
          <dd className="font-mono" data-testid="cart-taxes" data-value={tax_total || 0}>
            {amount(tax_total)}
          </dd>
        </div>
      </dl>

      <Rule className="my-4" weight="heavy" />

      <div className="flex items-baseline justify-between gap-4">
        <span className="text-body font-semibold">Total</span>
        <span
          className="font-mono text-lead"
          data-testid="cart-total"
          data-value={total || 0}
        >
          {amount(total)}
        </span>
      </div>

      <Rule className="mt-4" />
    </div>
  )
}

export default CartTotals
