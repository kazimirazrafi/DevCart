/* Same shape as a product plate, so the grid does not shift when products arrive. */
const SkeletonProductPreview = () => {
  return (
    <div
      className="flex w-full animate-pulse flex-col rounded-square border border-ink bg-stock motion-reduce:animate-none"
      aria-hidden="true"
    >
      <div className="aspect-square w-full border-b border-ink bg-ink/5" />
      <div className="flex flex-col gap-2 p-4">
        <div className="h-5 w-3/5 bg-ink/10" />
        <div className="h-4 w-1/4 bg-ink/10" />
      </div>
    </div>
  )
}

export default SkeletonProductPreview
