import clsx from "clsx"

/* Every skeleton in this folder is built from these bars. */
const SkeletonBar = ({ className }: { className?: string }) => (
  <div
    aria-hidden="true"
    className={clsx(
      "animate-pulse bg-ink/10 motion-reduce:animate-none",
      className
    )}
  />
)

export default SkeletonBar
