import { Rule } from "@modules/design-system"

const PILLARS = [
  {
    title: "One warehouse, honest stock",
    body: "Every listing shows the units actually on the shelf. Nothing is sold as a pre-order unless the product page says so.",
  },
  {
    title: "Specs on the page",
    body: "Material, weight, dimensions and the brand are printed like a spec sheet, because that is what people compare before they buy.",
  },
  {
    title: "Dispatched in two days",
    body: "Orders leave the warehouse within two business days, and anything unopened comes back inside thirty.",
  },
]

/**
 * Why this shop exists, told in one display line and three short pillars. It
 * sits between the product rows on purpose: by then a visitor has seen the
 * catalogue and is deciding whether the shop can be trusted with an order.
 */
export default function BrandStory() {
  return (
    <section
      aria-labelledby="brand-story-heading"
      className="border-b border-ink/20"
      data-testid="brand-story"
    >
      <div className="content-container grid grid-cols-1 gap-10 py-12 small:grid-cols-12 small:py-16">
        <div className="small:col-span-7">
          <h2
            id="brand-story-heading"
            className="max-w-[18ch] font-display text-h1 font-bold leading-[1.02] tracking-[-0.03em]"
          >
            A department store run like a print shop.
          </h2>
          <p className="mt-5 max-w-[54ch] text-lead leading-relaxed text-ink/80">
            We buy in small runs, photograph what arrives, and publish the
            numbers we were given. When a run sells out it stays out until the
            next one lands, which is why the stock count on a page is worth
            reading.
          </p>
        </div>

        <div className="small:col-span-5">
          <ul className="flex flex-col gap-5">
            {PILLARS.map((pillar) => (
              <li key={pillar.title} className="flex flex-col gap-2">
                <Rule />
                <h3 className="font-display text-h3 font-bold leading-tight">
                  {pillar.title}
                </h3>
                <p className="max-w-[46ch] text-small leading-relaxed text-ink/80">
                  {pillar.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
