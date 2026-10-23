import LocalizedClientLink from "@modules/common/components/localized-client-link"

export type Department = {
  id: string
  name: string
  handle: string
  children: { id: string; name: string; handle: string }[]
  productCount: number
}

/**
 * The shop's departments as one hairline grid — the fastest way from the home
 * page into a category, which is what the hero cannot do for a marketplace of
 * this size. Each cell names the department, says how much is in it, and lists
 * a few of its categories as plain text: one target per cell, no nested links.
 */
export default function DepartmentGrid({
  departments,
}: {
  departments: Department[]
}) {
  return (
    <section
      aria-labelledby="departments-heading"
      className="content-container border-b border-ink/20 py-10 small:py-14"
      id="departments"
    >
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
        <h2
          id="departments-heading"
          className="font-display text-h2 font-bold tracking-tight"
        >
          Shop by department
        </h2>
        <LocalizedClientLink
          href="/store"
          className="text-riso-blue underline underline-offset-4 hover:text-ink"
        >
          View all products
        </LocalizedClientLink>
      </div>

      <ul className="grid grid-cols-1 border-l border-t border-ink/20 small:grid-cols-2 medium:grid-cols-4">
        {departments.map((department) => (
          <li key={department.id} className="border-b border-r border-ink/20">
            <LocalizedClientLink
              href={`/categories/${department.handle}`}
              className="group flex h-full flex-col justify-between gap-6 p-5 transition-colors hover:bg-ink hover:text-stock focus-visible:bg-ink focus-visible:text-stock"
              data-testid="department-link"
            >
              <span className="flex items-baseline justify-between gap-3">
                <span className="font-display text-h3 font-bold leading-tight">
                  {department.name}
                </span>
                <span className="shrink-0 font-mono text-micro text-ink/70 group-hover:text-stock/80 group-focus-visible:text-stock/80">
                  {department.productCount}
                </span>
              </span>
              <span className="text-small text-ink/70 group-hover:text-stock/80 group-focus-visible:text-stock/80">
                {department.children
                  .slice(0, 3)
                  .map((child) => child.name)
                  .join(", ")}
                {department.children.length > 3
                  ? ` and ${department.children.length - 3} more`
                  : ""}
              </span>
            </LocalizedClientLink>
          </li>
        ))}
      </ul>
    </section>
  )
}
