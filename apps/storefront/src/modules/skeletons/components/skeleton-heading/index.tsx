import { Rule } from "@modules/design-system"
import clsx from "clsx"

/**
 * The display heading and heavy rule every page opens with, as ink bars. Same
 * height as the real heading so the content below does not jump when it lands.
 * Motion is off for anyone who asked for reduced motion (docs/DESIGN.md §5.1).
 */
const SkeletonHeading = ({ width = "w-2/5" }: { width?: string }) => {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true" data-testid="heading-loader">
      <div
        className={clsx(
          "h-10 max-w-[420px] animate-pulse bg-ink/10 motion-reduce:animate-none",
          width
        )}
      />
      <Rule weight="heavy" />
    </div>
  )
}

export default SkeletonHeading
