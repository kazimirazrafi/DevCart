"use client"

import { transferCart } from "@lib/data/customer"
import { ExclamationCircleSolid } from "@medusajs/icons"
import { StoreCart, StoreCustomer } from "@medusajs/types"
import { Button } from "@modules/common/components/ui"
import { useState } from "react"
function CartMismatchBanner(props: {
  customer: StoreCustomer
  cart: StoreCart
}) {
  const { customer, cart } = props
  const [isPending, setIsPending] = useState(false)
  const [actionText, setActionText] = useState("Run transfer again")

  if (!customer || !!cart.customer_id) {
    return
  }

  const handleSubmit = async () => {
    try {
      setIsPending(true)
      setActionText("Transferring..")

      await transferCart()
    } catch {
      setActionText("Run transfer again")
      setIsPending(false)
    }
  }

  /*
   * A notice about the cart, not part of the page: `aside` gives it a landmark
   * of its own, so the content is announced and axe's "content outside a
   * landmark" rule is satisfied. Yellow fill with ink text is the one sanctioned
   * highlight (12.40:1); the starter's orange-800 on orange-300 was 4.33:1.
   */
  return (
    <aside
      aria-label="Cart transfer notice"
      className="border-b border-ink bg-riso-yellow text-ink"
      data-testid="cart-mismatch-banner"
    >
      <div className="content-container flex items-center justify-center gap-2 p-2 text-center text-small small:p-4">
        <div className="flex flex-col items-center gap-1 small:flex-row small:gap-2">
          <span className="flex items-center gap-1">
            <ExclamationCircleSolid className="inline" aria-hidden="true" />
            Something went wrong when we tried to transfer your cart
          </span>

          <span aria-hidden="true">·</span>

          <Button
            variant="secondary"
            className="border-ink bg-transparent p-0 text-ink hover:bg-ink hover:text-stock"
            size="medium"
            disabled={isPending}
            onClick={handleSubmit}
          >
            {actionText}
          </Button>
        </div>
      </div>
    </aside>
  )
}

export default CartMismatchBanner
