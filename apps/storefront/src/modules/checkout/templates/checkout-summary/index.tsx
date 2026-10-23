import ItemsPreviewTemplate from "@modules/cart/templates/preview"
import CartTotals from "@modules/common/components/cart-totals"
import DiscountCode from "@modules/checkout/components/discount-code"
import { Rule } from "@modules/design-system"
import { HttpTypes } from "@medusajs/types"

const CheckoutSummary = ({ cart }: { cart: HttpTypes.StoreCart }) => {
  return (
    <div className="sticky top-0 flex flex-col-reverse gap-y-8 py-8 small:flex-col small:py-0">
      <div className="flex w-full flex-col">
        <Rule className="my-6 small:hidden" />
        <h2 className="flex flex-row items-baseline font-display text-h3 font-semibold text-ink">
          In your Cart
        </h2>
        <Rule className="my-6" />
        <CartTotals totals={cart} />
        <ItemsPreviewTemplate cart={cart} />
        <div className="my-6">
          <DiscountCode cart={cart} />
        </div>
      </div>
    </div>
  )
}

export default CheckoutSummary
