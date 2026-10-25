import SkeletonBar from "@modules/skeletons/components/skeleton-bar"
import { Rule } from "@modules/design-system"

/** The account area while it resolves who is asking: one shape for both states. */
export default function AccountLoading() {
  return (
    <div className="flex w-full flex-col gap-6" data-testid="account-loader">
      <SkeletonBar className="h-10 w-48" />
      <Rule weight="heavy" />
      <div className="flex max-w-sm flex-col gap-4">
        <SkeletonBar className="h-4 w-24" />
        <SkeletonBar className="h-11 w-full" />
        <SkeletonBar className="h-4 w-24" />
        <SkeletonBar className="h-11 w-full" />
        <SkeletonBar className="h-11 w-40" />
      </div>
    </div>
  )
}
