import SkeletonBar from "@modules/skeletons/components/skeleton-bar"
import { Rule } from "@modules/design-system"

/** The content column while an account page loads, shared by its three pages. */
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
