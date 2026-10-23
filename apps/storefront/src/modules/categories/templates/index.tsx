import { HttpTypes } from "@medusajs/types"

import { Rule, linkClass } from "@modules/design-system"
import CategorySwitcher from "@modules/categories/components/category-switcher"
import BreadcrumbJsonLd from "@modules/common/components/breadcrumb-json-ld"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import StoreTemplate from "@modules/store/templates"

/**
 * A category page: breadcrumb, title, description and the category switcher,
 * then the same search-driven listing `/store` uses with the catalogue pinned
 * to this category.
 *
 * The listing used to be server-rendered from the Store API with only a sort
 * control, which is why a category page offered no size, label or price
 * filters and no way to move to another category without going back to the
 * home page.
 */
export default function CategoryTemplate({
  category,
  categories,
  currencyCode,
  countryCode,
}: {
  category: HttpTypes.StoreProductCategory
  categories: HttpTypes.StoreProductCategory[]
  currencyCode: string
  countryCode: string
}) {
  const parents: HttpTypes.StoreProductCategory[] = []

  const getParents = (node: HttpTypes.StoreProductCategory) => {
    if (node.parent_category) {
      parents.push(node.parent_category)
      getParents(node.parent_category)
    }
  }

  getParents(category)
  parents.reverse()

  /* The same trail the breadcrumb below draws, in schema.org's shape. */
  const breadcrumbs = [
    { name: "Home", path: "" },
    ...parents.map((parent) => ({
      name: parent.name ?? "Category",
      path: `/categories/${parent.handle}`,
    })),
    {
      name: category.name ?? "Category",
      path: `/categories/${category.handle}`,
    },
  ]

  return (
    <>
      <BreadcrumbJsonLd countryCode={countryCode} items={breadcrumbs} />
      <section className="content-container border-b border-ink/20 pb-8 pt-10">
        <header className="flex flex-col gap-4">
          {parents.length > 0 && (
            <nav aria-label="Breadcrumb" className="text-small">
              <ol className="flex flex-wrap items-center gap-2">
                {parents.map((parent) => (
                  <li key={parent.id} className="flex items-center gap-2">
                    <LocalizedClientLink
                      href={`/categories/${parent.handle}`}
                      className={linkClass}
                    >
                      {parent.name}
                    </LocalizedClientLink>
                    <span aria-hidden="true" className="text-ink/70">
                      /
                    </span>
                  </li>
                ))}
              </ol>
            </nav>
          )}

          <h1
            className="font-display text-display"
            data-testid="category-page-title"
          >
            {category.name}
          </h1>

          {category.description && (
            <p className="max-w-[72ch] text-body text-ink/80">
              {category.description}
            </p>
          )}

          <Rule weight="heavy" />

          <CategorySwitcher categories={categories} current={category} />
        </header>
      </section>

      <StoreTemplate
        heading={null}
        currencyCode={currencyCode}
        facetFilters={[`category:${category.name}`]}
        hideCategoryFacet
      />
    </>
  )
}
