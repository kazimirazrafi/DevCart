import { listCategories } from "@lib/data/categories"
import { listCollections } from "@lib/data/collections"
import { getStoreName } from "@lib/util/env"
import { LEGAL_LINKS, SUPPORT_EMAIL } from "@modules/legal/links"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const DEPARTMENTS_SHOWN = 6
const COLLECTIONS_SHOWN = 5

const PAYMENT_MARKS = ["Visa", "Mastercard", "Amex", "Stripe"]

type FooterLink = { label: string; href: string }

const LinkColumn = ({
  title,
  links,
  testId,
}: {
  title: string
  links: FooterLink[]
  testId?: string
}) => (
  <div className="flex min-w-0 flex-col gap-3">
    <h2 className="text-small font-semibold text-ink">{title}</h2>
    <ul className="flex flex-col gap-2" data-testid={testId}>
      {links.map((link) => (
        <li key={`${title}-${link.href}`}>
          <LocalizedClientLink
            href={link.href}
            className="text-small text-ink/70 hover:text-ink"
          >
            {link.label}
          </LocalizedClientLink>
        </li>
      ))}
    </ul>
  </div>
)

export default async function Footer() {
  const [{ collections }, categories] = await Promise.all([
    listCollections({ fields: "id,handle,title" }),
    listCategories({
      limit: 100,
      fields: "id,name,handle,parent_category_id",
    }),
  ])

  const departments = categories
    .filter((category) => !category.parent_category_id && category.handle)
    .slice(0, DEPARTMENTS_SHOWN)
    .map((category) => ({
      label: category.name ?? "Department",
      href: `/categories/${category.handle}`,
    }))

  const collectionLinks = collections
    .filter((collection) => Boolean(collection.handle))
    .slice(0, COLLECTIONS_SHOWN)
    .map((collection) => ({
      label: collection.title ?? "Collection",
      href: `/collections/${collection.handle}`,
    }))

  const shopLinks: FooterLink[] = [
    ...departments,
    { label: "All products", href: "/store" },
  ]

  const help = LEGAL_LINKS.filter((link) =>
    ["/contact", "/shipping-and-delivery", "/returns-and-refunds"].includes(
      link.href
    )
  )

  const company = LEGAL_LINKS.filter((link) =>
    ["/about", "/privacy-policy", "/terms-and-conditions", "/cookie-policy"].includes(
      link.href
    )
  )

  return (
    <footer className="border-t border-ink/20" data-testid="footer">
      <div className="content-container">
        <div className="grid grid-cols-1 gap-10 py-10 small:grid-cols-12 small:gap-8 small:py-14">
          <div className="flex flex-col gap-4 small:col-span-4">
            <LocalizedClientLink
              href="/"
              className="font-display text-h3 font-bold tracking-tight text-ink"
            >
              {getStoreName()}
            </LocalizedClientLink>
            <p className="max-w-[32ch] text-small leading-relaxed text-ink/70">
              Eight departments, bought in small runs and shipped from one
              warehouse.
            </p>
            <div className="flex flex-col gap-1">
              <span className="text-small text-ink/70">Questions and returns</span>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="w-fit break-all text-small text-riso-blue underline underline-offset-4 hover:text-ink"
              >
                {SUPPORT_EMAIL}
              </a>
            </div>
            <ul
              aria-label="Accepted payment methods"
              className="mt-1 flex flex-wrap gap-2"
            >
              {PAYMENT_MARKS.map((mark) => (
                <li
                  key={mark}
                  className="border border-ink/30 px-2 py-1 font-mono text-micro text-ink/70"
                >
                  {mark}
                </li>
              ))}
            </ul>
          </div>

          <nav
            aria-label="Footer"
            className="grid grid-cols-2 gap-8 small:col-span-8 small:grid-cols-4"
          >
            <LinkColumn
              title="Shop"
              links={shopLinks}
              testId="footer-categories"
            />
            {collectionLinks.length > 0 && (
              <LinkColumn title="Collections" links={collectionLinks} />
            )}
            <LinkColumn title="Help" links={help} />
            <LinkColumn title="Company" links={company} />
          </nav>
        </div>

        <div className="flex flex-col gap-2 border-t border-ink/20 py-6 text-small text-ink/70 small:flex-row small:items-center small:justify-between">
          <p>
            © {new Date().getFullYear()} {getStoreName()}. All rights reserved.
          </p>
          <p>
            Prices and shipping are shown in your region&apos;s currency at
            checkout.
          </p>
        </div>
      </div>
    </footer>
  )
}
