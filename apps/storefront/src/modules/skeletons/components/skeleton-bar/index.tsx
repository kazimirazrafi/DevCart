import clsx from "clsx"

/**
 * One pulsing bar of ink. Every skeleton in this folder is built from these, so
 * the placeholders share a single width and rhythm instead of each drawing its
 * own grey box. Motion is off for anyone who asked for reduced motion
 * (docs/DESIGN.md §5.1).
 */
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
