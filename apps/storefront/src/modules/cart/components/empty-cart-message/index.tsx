import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { buttonClass } from "@modules/design-system"

const EmptyCartMessage = () => {
  return (
    <div
      className="flex flex-col items-start gap-4 py-24"
      data-testid="empty-cart-message"
    >
      <p className="max-w-[32rem] text-body text-ink">
        There is nothing in your cart yet. Pick something from the catalogue and
        it will show up here.
      </p>
      <LocalizedClientLink
        href="/store"
        className={buttonClass({ size: "large" })}
      >
        Browse products
      </LocalizedClientLink>
    </div>
  )
}

export default EmptyCartMessage
