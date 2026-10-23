import SkeletonBar from "@modules/skeletons/components/skeleton-bar"
import SkeletonButton from "@modules/skeletons/components/skeleton-button"
import SkeletonCartTotals from "@modules/skeletons/components/skeleton-cart-totals"

/** The bordered money box in the cart's right column. */
const SkeletonOrderSummary = () => {
  return (
    <div className="flex flex-col gap-6">
      <SkeletonBar className="h-5 w-24" />
      <SkeletonCartTotals header={false} />
      <SkeletonButton />
    </div>
  )
}

export default SkeletonOrderSummary
