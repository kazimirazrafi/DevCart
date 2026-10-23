import { HttpTypes } from "@medusajs/types"

import ItemsTemplate from "./items"
import Summary from "./summary"
import EmptyCartMessage from "../components/empty-cart-message"
import SignInPrompt from "../components/sign-in-prompt"
import { Rule } from "@modules/design-system"

const CartTemplate = ({
  cart,
  customer,
  availability = {},
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
  availability?: Record<string, number | null>
}) => {
  const totalItems =
    cart?.items?.reduce((count, item) => count + item.quantity, 0) ?? 0

  return (
    <div className="py-12">
      <div className="content-container" data-testid="cart-container">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h1 className="font-display text-h1 font-bold text-ink">Cart</h1>
          {cart?.items?.length ? (
            <p
              className="font-mono text-small text-ink/70"
              data-testid="cart-item-count"
            >
              {totalItems} {totalItems === 1 ? "item" : "items"}
            </p>
          ) : null}
        </div>

        <Rule weight="heavy" className="mt-4" />

        {cart?.items?.length ? (
          <div className="grid gap-10 pt-8 small:grid-cols-[1fr_360px] small:gap-16">
            <div className="flex min-w-0 flex-col gap-8">
              {!customer ? <SignInPrompt /> : null}
              <ItemsTemplate cart={cart} availability={availability} />
            </div>

            <div className="small:relative">
              <div className="sticky top-24 border border-ink p-6">
                <Summary cart={cart} availability={availability} />
              </div>
            </div>
          </div>
        ) : (
          <EmptyCartMessage />
        )}
      </div>
    </div>
  )
}

export default CartTemplate
