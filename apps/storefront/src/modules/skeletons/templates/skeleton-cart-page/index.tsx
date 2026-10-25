import repeat from "@lib/util/repeat"
import SkeletonBar from "@modules/skeletons/components/skeleton-bar"
import SkeletonCartItem from "@modules/skeletons/components/skeleton-cart-item"
import SkeletonCodeForm from "@modules/skeletons/components/skeleton-code-form"
import SkeletonOrderSummary from "@modules/skeletons/components/skeleton-order-summary"
import { Rule } from "@modules/design-system"

/* The same two columns as the real cart, so the page settles in place. */
const SkeletonCartPage = () => {
  return (
    <div className="py-12">
      <div className="content-container" data-testid="cart-loader">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <SkeletonBar className="h-10 w-32" />
          <SkeletonBar className="h-4 w-16" />
        </div>

        <Rule weight="heavy" className="mt-4" />

        <div className="grid gap-10 pt-8 small:grid-cols-[1fr_360px] small:gap-16">
          <ul className="flex min-w-0 flex-col">
            {repeat(3).map((index) => (
              <SkeletonCartItem key={index} />
            ))}
          </ul>

          <div className="small:relative">
            <div className="flex flex-col gap-8 border border-ink p-6">
              <SkeletonOrderSummary />
              <SkeletonCodeForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SkeletonCartPage
