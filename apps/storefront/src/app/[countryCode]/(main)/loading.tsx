import SkeletonListingPage from "@modules/skeletons/templates/skeleton-listing-page"

/**
 * The fallback for any page in this group that does not bring its own: home,
 * the search-driven listing and the smaller pages (verify, order transfer).
 * It is deliberately the plainest thing in the system — a heading, a rule and a
 * page of plates — because it is shown on pages of several shapes.
 */
export default function MainGroupLoading() {
  return <SkeletonListingPage withFilters={false} />
}
