"use client"

import { HttpTypes } from "@medusajs/types"

import CartTotals from "@modules/common/components/cart-totals"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Rule, buttonClass } from "@modules/design-system"
import DiscountCode from "@modules/checkout/components/discount-code"

type SummaryProps = {
  cart: HttpTypes.StoreCart
  /** Units left per variant id; `null` where stock is not a limit. */
  availability?: Record<string, number | null>
}

const Summary = ({ cart, availability = {} }: SummaryProps) => {
  /*
   * A line can be left holding more units than the catalogue has: the stock can
   * drop under it while the cart waits. Checkout would fail on it later, so the
   * cart says what to fix and holds the button until it is fixed.
   */
  const linesOverStock = (cart.items ?? []).filter((item) => {
    const available = item.variant_id ? availability[item.variant_id] : undefined

    return typeof available === "number" && item.quantity > available
  })

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-display text-lead font-semibold text-ink">Summary</h2>

      <DiscountCode cart={cart} />

      <Rule />

      <CartTotals totals={cart} />

      {linesOverStock.length > 0 ? (
        <p
          role="status"
          className="text-small font-semibold text-ink"
          data-testid="checkout-stock-warning"
        >
          Some quantities are above what is left in stock. Lower them to
          continue.
        </p>
      ) : null}

      {/*
        * No step in the URL: the checkout resolves the first unfinished step
        * from the cart and the visitor's own state (a guest's address also has
        * to be verified), and a step named here would only be a second guess at
        * the same answer.
        */}
      {linesOverStock.length > 0 ? (
        <button
          type="button"
          disabled
          className={buttonClass({ size: "large", className: "w-full" })}
          data-testid="checkout-button"
        >
          Go to checkout
        </button>
      ) : (
        <LocalizedClientLink
          href="/checkout"
          className={buttonClass({ size: "large", className: "w-full" })}
          data-testid="checkout-button"
        >
          Go to checkout
        </LocalizedClientLink>
      )}
    </div>
  )
}

export default Summary
