import repeat from "@lib/util/repeat"
import SkeletonProductPreview from "@modules/skeletons/components/skeleton-product-preview"
import { Rule } from "@modules/design-system"

const Bar = ({ className }: { className: string }) => (
  <div className={`animate-pulse bg-ink/10 motion-reduce:animate-none ${className}`} />
)

/**
 * A product page while its product is on the way: the gallery column, the
 * buying column (title, price, one row of option chips per option, the add
 * button) and the related strip below. Same columns as the real page, so the
 * layout settles instead of jumping when the product arrives.
 */
const SkeletonProductPage = () => {
  return (
    <div
      className="content-container py-10 small:py-14"
      aria-hidden="true"
      data-testid="product-page-loader"
    >
      <Bar className="mb-6 h-4 w-40" />

      <div className="grid gap-10 small:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] small:gap-16">
        <div className="flex flex-col gap-4">
          <div className="aspect-square w-full animate-pulse bg-ink/5 motion-reduce:animate-none" />
          <div className="flex gap-3">
            {repeat(4).map((index) => (
              <Bar key={index} className="h-16 w-16 shrink-0" />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <Bar className="h-9 w-3/4" />
          <Bar className="h-6 w-1/3" />

          <div className="flex flex-col gap-4 border-t border-ink/20 pt-6">
            <Bar className="h-4 w-1/4" />
            <div className="flex flex-wrap gap-2">
              <Bar className="h-9 w-16" />
              <Bar className="h-9 w-16" />
              <Bar className="h-9 w-16" />
            </div>
            <Bar className="h-4 w-1/5" />
            <div className="flex flex-wrap gap-2">
              <Bar className="h-9 w-20" />
              <Bar className="h-9 w-20" />
            </div>
          </div>

          <Bar className="h-14 w-full" />
          <Rule className="my-2" />
          <div className="flex flex-col gap-3">
            <Bar className="h-4 w-full" />
            <Bar className="h-4 w-4/5" />
            <Bar className="h-4 w-3/5" />
          </div>
        </div>
      </div>

      <section className="mt-16 flex flex-col gap-6">
        <Bar className="h-8 w-56" />
        <Rule weight="heavy" />
        <ul className="grid grid-cols-2 gap-x-4 gap-y-8 small:grid-cols-3 small:gap-x-6">
          {repeat(4).map((index) => (
            <li key={index}>
              <SkeletonProductPreview />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

export default SkeletonProductPage
