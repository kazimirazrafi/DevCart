import SkeletonListingPage from "@modules/skeletons/templates/skeleton-listing-page"

/** Fallback for any page in this group that does not bring its own. */
export default function MainGroupLoading() {
  return <SkeletonListingPage withFilters={false} />
}
