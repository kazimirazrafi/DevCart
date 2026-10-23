import { Metadata } from "next"

import { pageMetadata } from "@lib/util/seo"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export async function generateMetadata(props: {
  params: Promise<{ countryCode: string }>
}): Promise<Metadata> {
  const { countryCode } = await props.params

  return pageMetadata({
    countryCode,
    path: "/about",
    title: "About DevCart",
    description:
      "DevCart is a small department store buying in short runs, photographing what arrives and publishing the stock numbers it was given.",
  })
}

const FACTS = [
  { value: "8", label: "departments, from electronics to the weekly grocery run" },
  { value: "1", label: "warehouse, so the stock count on a page is the stock" },
  { value: "30 days", label: "to send back anything unopened" },
]

export default function AboutPage() {
  return (
    <div className="content-container border-b border-ink/20 py-10 small:py-16">
      <h1 className="max-w-[18ch] font-display text-h1 font-bold leading-[1.02] tracking-[-0.03em] text-ink">
        A department store run like a print shop.
      </h1>

      <div className="mt-8 grid grid-cols-1 gap-8 small:grid-cols-12 small:gap-12">
        <div className="flex flex-col gap-4 small:col-span-7">
          <p className="max-w-prose text-lead leading-relaxed text-ink/80">
            We buy in small runs, photograph what arrives, and publish the
            numbers we were given. When a run sells out it stays out until the
            next one lands.
          </p>
          <p className="max-w-prose text-body leading-relaxed text-ink/80">
            That is the whole method. It means the shop holds a narrower
            catalogue than a supermarket and a wider one than a boutique: eight
            departments, a short list in each, and a stock count worth reading
            because it is the same number the warehouse has.
          </p>
          <p className="max-w-prose text-body leading-relaxed text-ink/80">
            Orders leave that one warehouse within two business days, and
            anything unopened comes back inside thirty.
          </p>
        </div>

        <ul className="small:col-span-5 flex flex-col border-l border-t border-ink/20">
          {FACTS.map((fact) => (
            <li
              key={fact.value}
              className="flex items-baseline gap-4 border-b border-r border-ink/20 px-4 py-5"
            >
              <span className="font-display text-h2 font-bold leading-none text-ink">
                {fact.value}
              </span>
              <span className="text-small leading-snug text-ink/70">
                {fact.label}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <LocalizedClientLink
        href="/store"
        className="mt-10 inline-flex min-h-12 items-center border border-riso-blue bg-riso-blue px-5 font-semibold text-stock transition-colors hover:border-ink hover:bg-ink"
      >
        Shop the catalogue
      </LocalizedClientLink>
    </div>
  )
}
