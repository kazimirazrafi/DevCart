import clsx from "clsx"

import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const CHIP =
  "flex min-h-11 items-center border px-3 text-small transition-colors focus-visible:outline-offset-2"

export default function CategorySwitcher({
  categories,
  current,
}: {
  categories: HttpTypes.StoreProductCategory[]
  current: HttpTypes.StoreProductCategory
}) {
  const departments = categories.filter(
    (category) => !category.parent_category_id && !category.parent_category
  )

  const parent = current.parent_category
  const department = parent ?? current
  const siblings = (department.category_children ?? []).filter(
    (category) => category.handle
  )

  const chipClass = (isCurrent: boolean, isSection: boolean) =>
    clsx(
      CHIP,
      isCurrent
        ? "border-ink bg-ink text-stock"
        : isSection
          ? "border-ink text-ink"
          : "border-ink/40 text-ink hover:border-ink"
    )

  return (
    <nav
      aria-label="Browse categories"
      className="flex flex-col gap-2"
      data-testid="category-switcher"
    >
      <ul className="flex flex-wrap gap-2">
        {departments.map((category) => (
          <li key={category.id}>
            <LocalizedClientLink
              href={`/categories/${category.handle}`}
              className={chipClass(
                category.id === current.id,
                category.id === department.id
              )}
              aria-current={category.id === current.id ? "page" : undefined}
            >
              {category.name}
            </LocalizedClientLink>
          </li>
        ))}
      </ul>

      {siblings.length > 1 ? (
        <ul
          className="flex flex-wrap gap-2 border-t border-ink/20 pt-2"
          aria-label={`Categories in ${department.name}`}
        >
          {siblings.map((category) => (
            <li key={category.id}>
              <LocalizedClientLink
                href={`/categories/${category.handle}`}
                className={chipClass(category.id === current.id, false)}
                aria-current={category.id === current.id ? "page" : undefined}
              >
                {category.name}
              </LocalizedClientLink>
            </li>
          ))}
        </ul>
      ) : null}
    </nav>
  )
}
