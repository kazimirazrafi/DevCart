import SkeletonBar from "@modules/skeletons/components/skeleton-bar"

/* A list item, matching the real cart's `<li>` inside a `<ul>`. */
const SkeletonCartItem = () => {
  return (
    <li
      className="flex gap-4 border-b border-ink/20 py-6"
      data-testid="cart-item-loader"
    >
      <SkeletonBar className="h-20 w-20 shrink-0 small:h-24 small:w-24" />

      <div className="flex flex-1 flex-col gap-3">
        <SkeletonBar className="h-4 w-40" />
        <SkeletonBar className="h-4 w-24" />
        <SkeletonBar className="h-9 w-20" />
      </div>

      <div className="flex w-24 flex-col items-end gap-3">
        <SkeletonBar className="h-4 w-16" />
        <SkeletonBar className="h-4 w-20" />
      </div>
    </li>
  )
}

export default SkeletonCartItem
