import { Metadata } from "next"

import { Button, Input, Link, linkClass, Plate, Rule } from "@modules/design-system"

export const metadata: Metadata = {
  title: "Design system",
  description: "Internal reference for the DevCart design tokens and base components.",
  robots: { index: false, follow: false },
}

/* Internal reference page for the design foundation: no backend dependency, not
 * linked from the navigation. Values mirror src/styles/globals.css. */

/* Each token has a value per mode; both hexes are printed for reference. */
const COLOURS = [
  {
    name: "stock",
    light: "#E8E9E3",
    dark: "#14151A",
    swatch: "bg-stock",
    usage: "Page ground. Uncoated paper.",
    contrast: "Ink on stock is 14.54:1 light, 14.93:1 dark.",
  },
  {
    name: "ink",
    light: "#17181B",
    dark: "#E8E9E3",
    swatch: "bg-ink",
    usage: "Text, rules, plate borders.",
    contrast: "The same pair from the other side: stock on ink, 14.54:1 light.",
  },
  {
    name: "riso-blue",
    light: "#006DAE",
    dark: "#6FB3E0",
    swatch: "bg-riso-blue",
    usage: "Links, primary buttons, focus ring.",
    contrast: "On stock 4.53:1 light, 7.99:1 dark — safe for text in both.",
  },
  {
    name: "riso-pink",
    light: "#FB008E",
    dark: "#F27AB8",
    swatch: "bg-riso-pink",
    usage: "Display text at 24px+, fills, markers.",
    contrast:
      "On stock 3.13:1 light (large text and markers only), 7.16:1 dark. Ink on a pink fill is 4.64:1 light; stock on it is 7.16:1 dark.",
  },
  {
    name: "riso-yellow",
    light: "#FFD400",
    dark: "#6B5700",
    swatch: "bg-riso-yellow",
    usage: "Fill behind ink text only.",
    contrast:
      "Ink on yellow is 12.40:1 light; in dark mode the fill is a mustard and the paper on it reads at 5.75:1. Yellow is never text.",
  },
  {
    name: "riso-green",
    light: "#007942",
    dark: "#56C08D",
    swatch: "bg-riso-green",
    usage: "State: in stock, confirmed.",
    contrast:
      "On stock 4.51:1 light, 8.09:1 dark — safe for text in both. Use stock on a green fill, not ink.",
  },
]

const TYPE_SCALE = [
  { token: "text-hero", role: "Hero headline", className: "font-display text-hero" },
  { token: "text-display", role: "Page headline", className: "font-display text-display" },
  { token: "text-h1", role: "Section heading", className: "font-display text-h1" },
  { token: "text-h2", role: "Sub-section heading", className: "font-display text-h2" },
  { token: "text-h3", role: "Card group heading", className: "font-display text-h3" },
  { token: "text-lead", role: "Product title, intro", className: "font-sans text-lead" },
  { token: "text-body", role: "Body copy, buttons", className: "font-sans text-body" },
  { token: "text-small", role: "Labels, hints, prices", className: "font-sans text-small" },
  { token: "text-micro", role: "Least important detail", className: "font-sans text-micro" },
]

const Section = ({
  title,
  note,
  children,
}: {
  title: string
  note?: string
  children: React.ReactNode
}) => (
  <section className="flex flex-col gap-6">
    <div className="flex flex-col gap-2">
      <h2 className="font-display text-h2 text-ink">{title}</h2>
      {note && <p className="max-w-[72ch] text-body text-ink">{note}</p>}
    </div>
    {children}
  </section>
)

export default function DesignSystemPage() {
  return (
    <main id="main" tabIndex={-1} className="min-h-screen bg-stock px-gutter py-section">
      <div className="mx-auto flex max-w-content flex-col gap-section">
        <header className="flex flex-col gap-4">
          <h1 className="font-display text-h1 text-ink">DevCart design system</h1>
          <p className="max-w-[72ch] text-body text-ink">
            Internal reference for the tokens and base components. Nothing on this page is part
            of the storefront; it exists so the foundation can be checked in one place.
          </p>
          <p className="max-w-[72ch] text-small text-ink">
            Dark mode is the same six tokens re-mixed for a near-black sheet. The swatches below
            follow whichever mode this page is in; both values are printed beside each name.
          </p>
          <p className="max-w-[72ch] text-small text-ink">
            Registration marks, overprint and the settle-into-register animation are deferred
            polish and are deliberately absent here.
          </p>
        </header>

        <Rule weight="heavy" />

        <Section
          title="Colour"
          note="Six tokens. A view uses at most two inks: ink plus riso-blue by default, with riso-pink as the one loud element."
        >
          <ul className="grid grid-cols-1 gap-6 small:grid-cols-2 large:grid-cols-3">
            {COLOURS.map((colour) => (
              <li key={colour.name} className="flex flex-col rounded-square border border-ink">
                <div className={`h-24 w-full border-b border-ink ${colour.swatch}`} />
                <div className="flex flex-col gap-2 p-4">
                  <p className="font-mono text-small text-ink">{colour.name}</p>
                  <p className="font-mono text-small text-ink/70">
                    {colour.light} / {colour.dark}
                  </p>
                  <p className="text-body text-ink">{colour.usage}</p>
                  <p className="text-small text-ink">{colour.contrast}</p>
                </div>
              </li>
            ))}
          </ul>
        </Section>

        <Rule />

        <Section
          title="Type scale"
          note="1.25 ratio on a 16px base: 12 / 14 / 16 / 20 / 25 / 31 / 39 / 49 / 61. Bricolage Grotesque for display, IBM Plex Sans for body and UI, IBM Plex Mono for machine data only."
        >
          <ul className="flex flex-col gap-6">
            {TYPE_SCALE.map((step) => (
              <li key={step.token} className="flex flex-col gap-1 border-t border-ink pt-4">
                <span className={`${step.className} text-ink`}>Hamburgefonstiv</span>
                <span className="font-mono text-small text-ink">
                  {step.token} — {step.role}
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Rule />

        <Section title="Spacing and radius" note="The system is square. Radius is a single token set to zero.">
          <ul className="flex flex-col gap-4">
            <li className="flex flex-wrap items-center gap-4">
              <span className="w-40 font-mono text-small text-ink">px-gutter</span>
              <span className="h-6 w-6 border border-ink bg-riso-blue" aria-hidden="true" />
              <span className="text-small text-ink">1.5rem page edge</span>
            </li>
            <li className="flex flex-wrap items-center gap-4">
              <span className="w-40 font-mono text-small text-ink">py-section</span>
              <span className="h-6 w-24 border border-ink bg-riso-blue" aria-hidden="true" />
              <span className="text-small text-ink">6rem between bands</span>
            </li>
            <li className="flex flex-wrap items-center gap-4">
              <span className="w-40 font-mono text-small text-ink">rounded-square</span>
              <span className="h-6 w-6 border-2 border-ink" aria-hidden="true" />
              <span className="text-small text-ink">0px, the only radius</span>
            </li>
          </ul>
        </Section>

        <Rule weight="heavy" />

        <Section
          title="Button"
          note="Primary is riso-blue with stock text. Secondary is ink on stock, inverting on hover. Every control shows the shared riso-blue focus ring when reached by keyboard."
        >
          <div className="flex flex-wrap items-center gap-4">
            <Button variant="primary" size="small">
              Add to cart
            </Button>
            <Button variant="primary" size="medium">
              Add to cart
            </Button>
            <Button variant="primary" size="large">
              Add to cart
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Button variant="secondary" size="small">
              View details
            </Button>
            <Button variant="secondary" size="medium">
              View details
            </Button>
            <Button variant="secondary" size="large">
              View details
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Button loading>Add to cart</Button>
            <Button disabled>Sold out</Button>
            <Button variant="secondary" loading>
              Saving
            </Button>
            <Button variant="secondary" disabled>
              Sold out
            </Button>
          </div>
        </Section>

        <Rule />

        <Section
          title="Plate"
          note="The shell every product sits in: square, hairline border, no shadow. Media, body, title, price and meta are fixed slots."
        >
          <ul className="grid grid-cols-1 gap-6 small:grid-cols-2 large:grid-cols-3">
            <Plate as="li">
              <Plate.Media />
              <Plate.Body>
                <Plate.Title>Ink and register hoodie</Plate.Title>
                <Plate.Price>EUR 45.00</Plate.Price>
                <Plate.Meta>In stock</Plate.Meta>
              </Plate.Body>
            </Plate>
            <Plate as="li">
              <Plate.Media />
              <Plate.Body>
                <Plate.Title>Compile and chill cap</Plate.Title>
                <Plate.Price>EUR 25.00</Plate.Price>
                <Plate.Meta>In stock</Plate.Meta>
              </Plate.Body>
            </Plate>
            <Plate as="li">
              <Plate.Media />
              <Plate.Body>
                <Plate.Title>Merge conflict tote</Plate.Title>
                <Plate.Price>EUR 18.00</Plate.Price>
                <Plate.Meta>Out of stock</Plate.Meta>
              </Plate.Body>
            </Plate>
          </ul>
        </Section>

        <Rule />

        <Section title="Rule" note="Hairline separates; heavy closes a band.">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <Rule />
              <span className="font-mono text-small text-ink">hairline</span>
            </div>
            <div className="flex flex-col gap-2">
              <Rule weight="heavy" />
              <span className="font-mono text-small text-ink">heavy</span>
            </div>
          </div>
        </Section>

        <Rule />

        <Section
          title="Input"
          note="Label, hint and error. The error is marked by a pink border but written in ink, because riso-pink is below AA for normal text."
        >
          <div className="grid grid-cols-1 gap-6 small:grid-cols-2">
            <Input id="ds-email" label="Email" placeholder="you@example.com" type="email" />
            <Input
              id="ds-email-help"
              label="Email"
              placeholder="you@example.com"
              type="email"
              hint="We send order updates here."
            />
            <Input
              id="ds-email-invalid"
              label="Email"
              defaultValue="not-an-email"
              type="email"
              error="Enter an email address in the form you@example.com."
            />
            <Input id="ds-email-off" label="Email" defaultValue="you@example.com" disabled />
          </div>
        </Section>

        <Rule />

        <Section
          title="Link"
          note="riso-blue on stock is 4.53:1, so links are safe at body size. In-store navigation keeps using the country-aware localized link with linkClass."
        >
          <p className="text-body text-ink">
            Read the <Link href="https://docs.medusajs.com">Medusa documentation</Link> for the
            framework details.
          </p>
          <p className="max-w-[72ch] text-small text-ink">
            Internal markup uses <span className="font-mono">{"<LocalizedClientLink>"}</span> with{" "}
            <span className="font-mono">{`className={linkClass}`}</span>. The class is{" "}
            <span className="font-mono">linkClass</span>, exported alongside the component.
          </p>
          <Link className={linkClass} href="/">
            Back to the store
          </Link>
        </Section>
      </div>
    </main>
  )
}
