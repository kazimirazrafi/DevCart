import SkeletonBar from "@modules/skeletons/components/skeleton-bar"

/** The discount field and its button, before either has rendered. */
const SkeletonCodeForm = () => {
  return (
    <div className="flex w-full flex-col gap-3">
      <SkeletonBar className="h-4 w-28" />
      <div className="grid grid-cols-[1fr_96px] gap-2">
        <SkeletonBar className="h-11" />
        <SkeletonBar className="h-11" />
      </div>
    </div>
  )
}

export default SkeletonCodeForm
