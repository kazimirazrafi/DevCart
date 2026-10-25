import repeat from "@lib/util/repeat"
import SkeletonBar from "@modules/skeletons/components/skeleton-bar"
import SkeletonLineItem from "@modules/skeletons/components/skeleton-line-item"
import { Rule } from "@modules/design-system"

/* The same receipt the customer is about to read, so the page settles in place. */
const SkeletonOrderConfirmed = () => {
  return (
    <div className="content-container py-10 small:py-16" data-testid="order-confirmed-loader">
      <div className="flex w-full max-w-3xl flex-col gap-8">
        <header className="flex flex-col gap-2">
          <SkeletonBar className="h-10 w-56" />
          <SkeletonBar className="h-4 w-64" />
        </header>

        <div className="flex flex-col gap-3 border border-ink p-5">
          <SkeletonBar className="h-4 w-28" />
          <SkeletonBar className="h-7 w-24" />
        </div>

        <div className="flex flex-col gap-3">
          <SkeletonBar className="h-4 w-full max-w-lg" />
          <SkeletonBar className="h-4 w-48" />
        </div>

        <div className="flex flex-col gap-4">
          <SkeletonBar className="h-7 w-32" />
          <Rule className="mb-0" />
          <table className="w-full caption-bottom">
            <tbody>
              {repeat(2).map((index) => (
                <SkeletonLineItem key={index} />
              ))}
            </tbody>
          </table>
          <div className="flex flex-col gap-3 pt-2">
            <div className="flex items-center justify-between gap-4">
              <SkeletonBar className="h-3 w-40" />
              <SkeletonBar className="h-3 w-16" />
            </div>
            <div className="flex items-center justify-between gap-4">
              <SkeletonBar className="h-3 w-24" />
              <SkeletonBar className="h-3 w-16" />
            </div>
            <Rule weight="heavy" className="my-2" />
            <div className="flex items-center justify-between gap-4">
              <SkeletonBar className="h-5 w-20" />
              <SkeletonBar className="h-5 w-24" />
            </div>
          </div>
        </div>

        <Rule weight="heavy" />

        <div className="flex flex-col gap-3">
          <SkeletonBar className="h-7 w-32" />
          <SkeletonBar className="h-4 w-40" />
          <SkeletonBar className="h-4 w-56" />
        </div>

        <div className="flex flex-col gap-3">
          <SkeletonBar className="h-7 w-28" />
          <SkeletonBar className="h-4 w-44" />
        </div>
      </div>
    </div>
  )
}

export default SkeletonOrderConfirmed
