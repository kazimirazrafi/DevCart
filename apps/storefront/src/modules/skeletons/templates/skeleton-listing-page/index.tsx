import SkeletonHeading from "@modules/skeletons/components/skeleton-heading"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"

const Bar = ({ className }: { className: string }) => (
  <div className={`animate-pulse bg-ink/10 motion-reduce:animate-none ${className}`} />
)

/* Filter rail only from `small` up, same as the real listing. */
const SkeletonListingPage = ({
  withFilters = true,
  numberOfProducts = 9,
}: {
  withFilters?: boolean
  numberOfProducts?: number
}) => {
  return (
    <div
      className="content-container py-10 small:py-14"
      aria-hidden="true"
      data-testid="listing-page-loader"
    >
      <SkeletonHeading />

      <div
        className={
          withFilters
            ? "grid gap-10 pt-8 small:grid-cols-[240px_1fr]"
            : "pt-8"
        }
      >
        {withFilters && (
          <div className="hidden flex-col gap-8 small:flex">
            <div className="flex flex-col gap-3">
              <Bar className="h-4 w-1/3" />
              <Bar className="h-11 w-full" />
            </div>
            <div className="flex flex-col gap-3">
              <Bar className="h-4 w-2/5" />
              <Bar className="h-4 w-4/5" />
              <Bar className="h-4 w-3/5" />
              <Bar className="h-4 w-4/5" />
            </div>
            <div className="flex flex-col gap-3">
              <Bar className="h-4 w-1/4" />
              <Bar className="h-11 w-full" />
            </div>
          </div>
        )}

        <SkeletonProductGrid numberOfProducts={numberOfProducts} />
      </div>
    </div>
  )
}

export default SkeletonListingPage
