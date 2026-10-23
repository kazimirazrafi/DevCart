import SkeletonBar from "@modules/skeletons/components/skeleton-bar"
import { Rule } from "@modules/design-system"

/**
 * The account's content column while a page of it loads: a heading, its rule
 * and a couple of blocks, which is the shape the overview, the addresses and
 * the order history all share.
 */
export default function AccountDashboardLoading() {
  return (
    <div className="flex w-full flex-col gap-6" data-testid="account-page-loader">
      <SkeletonBar className="h-10 w-56" />
      <Rule weight="heavy" />
      <div className="flex flex-col gap-4">
        <SkeletonBar className="h-4 w-full max-w-lg" />
        <SkeletonBar className="h-4 w-3/4 max-w-md" />
      </div>
      <div className="flex flex-col gap-6 pt-2">
        <SkeletonBar className="h-40 w-full border border-ink/20" />
        <SkeletonBar className="h-40 w-full border border-ink/20" />
      </div>
    </div>
  )
}
