import { getStoreName } from "@lib/util/env"

const FACTS = [
  { label: "Despatch", value: "2 days" },
  { label: "Returns", value: "30 days" },
  { label: "Warehouse", value: "One" },
]

const DEPARTMENTS =
  "Electronics, fashion, beauty, home, groceries, sports, toys and books."

/**
 * The sign-in page's brand panel.
 *
 * The design is a printed label rather than a photograph: a stock sheet inside
 * two misregistered ink plates, the way the hero and the product plates are
 * built. Because it is made of the theme's tokens and nothing else, it inverts
 * with dark mode along with the rest of the page — there is no image to pick a
 * second version of, and no light-only surface to glare through.
 *
 * Decorative, so it is hidden from assistive technology and drops out entirely
 * below `small`, where the form is the whole page.
 */
export default function AuthArtwork() {
  return (
    <aside
      aria-hidden="true"
      className="hidden h-full small:col-span-5 small:block"
    >
      <div className="relative mx-2 my-2 h-full">
        <div className="absolute -left-2 -top-2 h-full w-full border border-riso-pink" />
        <div className="absolute -bottom-2 -right-2 h-full w-full border border-riso-blue" />

        <div className="relative flex h-full flex-col justify-between border border-ink bg-stock p-7">
          <div className="flex items-baseline justify-between gap-4">
            <span className="font-display text-h3 font-bold tracking-tight text-ink">
              {getStoreName()}
            </span>
            <span className="font-mono text-micro text-ink/70">Account</span>
          </div>

          <div className="my-10">
            <p className="max-w-[15ch] font-display text-h1 font-bold leading-[1.02] tracking-[-0.03em] text-ink">
              Your orders, addresses and cart in one place.
            </p>
            <p className="mt-4 max-w-[34ch] text-small leading-relaxed text-ink/70">
              Signed in, the cart and the addresses follow you to any device.
            </p>
          </div>

          <div className="bg-riso-yellow p-4 text-ink">
            <p className="font-mono text-micro">From one warehouse</p>
            <p className="mt-2 max-w-[26ch] text-small leading-relaxed">
              {DEPARTMENTS}
            </p>
          </div>

          <ul className="mt-6 border-t border-ink/20">
            {FACTS.map((fact) => (
              <li
                key={fact.label}
                className="flex items-baseline justify-between border-b border-ink/20 py-2 text-small"
              >
                <span className="text-ink/70">{fact.label}</span>
                <span className="font-mono text-ink">{fact.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  )
}
