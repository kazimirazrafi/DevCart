import repeat from "@lib/util/repeat"
import SkeletonProductPreview from "@modules/skeletons/components/skeleton-product-preview"

const SkeletonRelatedProducts = () => {
  return (
    <div>
      <div className="mb-6 flex flex-col gap-4">
        <div className="h-8 w-56 animate-pulse bg-ink/10 motion-reduce:animate-none" />
        <div className="h-px w-full border-t-2 border-ink" />
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-8 small:grid-cols-3 small:gap-x-6">
        {repeat(4).map((index) => (
          <li key={index}>
            <SkeletonProductPreview />
          </li>
        ))}
      </ul>
    </div>
  )
}

export default SkeletonRelatedProducts
