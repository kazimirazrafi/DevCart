import SkeletonBar from "@modules/skeletons/components/skeleton-bar"
import { Rule } from "@modules/design-system"

const SkeletonCartTotals = ({ header = true }: { header?: boolean }) => {
  return (
    <div className="flex flex-col gap-3">
      {header && <SkeletonBar className="mb-1 h-4 w-32" />}

      <div className="flex items-center justify-between gap-4">
        <SkeletonBar className="h-3 w-40" />
        <SkeletonBar className="h-3 w-16" />
      </div>
      <div className="flex items-center justify-between gap-4">
        <SkeletonBar className="h-3 w-20" />
        <SkeletonBar className="h-3 w-16" />
      </div>
      <div className="flex items-center justify-between gap-4">
        <SkeletonBar className="h-3 w-24" />
        <SkeletonBar className="h-3 w-16" />
      </div>

      <Rule weight="heavy" className="my-3" />

      <div className="flex items-center justify-between gap-4">
        <SkeletonBar className="h-5 w-20" />
        <SkeletonBar className="h-5 w-24" />
      </div>

      <Rule className="mt-3" />
    </div>
  )
}

export default SkeletonCartTotals
