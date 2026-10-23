import { Metadata } from "next"

import { pageMetadata } from "@lib/util/seo"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Rule } from "@modules/design-system"
import { SUPPORT_EMAIL } from "@modules/legal/links"

export async function generateMetadata(props: {
  params: Promise<{ countryCode: string }>
}): Promise<Metadata> {
  const { countryCode } = await props.params

  return pageMetadata({
    countryCode,
    path: "/contact",
    title: "Contact us",
    description:
      "Reach DevCart support about an order, a return, or the personal data we hold. A person answers within two business days.",
  })
}

const HELP = [
  {
    title: "About an order",
    body: "Have the order number ready if you can. If the order has already shipped, the despatch email carries its tracking.",
    linkLabel: "Open your orders",
    href: "/account",
  },
  {
    title: "About a return",
    body: "Unused items can come back within thirty days of delivery. Tell us which item and we will send the return address.",
    linkLabel: "Read the returns policy",
    href: "/returns-and-refunds",
  },
  {
    title: "About your data",
    body: "Ask us to show, correct or delete the data we hold about you. We may ask you to confirm you are the account holder first.",
    linkLabel: "Read the privacy policy",
    href: "/privacy-policy",
  },
]

export default function ContactPage() {
  return (
    <div className="content-container border-b border-ink/20 py-10 small:py-16">
      <div className="grid grid-cols-1 gap-10 small:grid-cols-12 small:gap-14">
        <div className="small:col-span-7">
          <h1 className="max-w-[16ch] font-display text-h1 font-bold leading-[1.02] tracking-[-0.03em] text-ink">
            Contact us
          </h1>
          <p className="mt-5 max-w-prose text-lead leading-relaxed text-ink/80">
            One person reads this inbox. Write with the order number in the
            subject line and you will hear back within two business days.
          </p>

          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="mt-8 inline-flex min-h-12 items-center border border-riso-blue bg-riso-blue px-5 font-semibold text-stock transition-colors hover:border-ink hover:bg-ink"
            data-testid="contact-email"
          >
            Write to {SUPPORT_EMAIL}
          </a>

          <p className="mt-4 text-small text-ink/70">
            Prefer your own mail app? Send to{" "}
            <span className="font-mono text-ink">{SUPPORT_EMAIL}</span>.
          </p>
        </div>

        <div className="small:col-span-5">
          <p className="border border-ink p-5 text-small leading-relaxed text-ink/80">
            We do not run a walk-in shop, so there is no counter to visit.
            Everything is handled by email and from the one warehouse.
          </p>
        </div>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-8 small:grid-cols-3">
        {HELP.map((item) => (
          <section key={item.title} className="flex flex-col gap-3">
            <Rule />
            <h2 className="font-display text-h3 font-bold leading-tight text-ink">
              {item.title}
            </h2>
            <p className="text-small leading-relaxed text-ink/80">{item.body}</p>
            <LocalizedClientLink
              href={item.href}
              className="text-small text-riso-blue underline underline-offset-4 hover:text-ink"
            >
              {item.linkLabel}
            </LocalizedClientLink>
          </section>
        ))}
      </div>
    </div>
  )
}
