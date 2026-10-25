import { Rule } from "@modules/design-system"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

import type { LegalDocument } from "../content"
import { LEGAL_LINKS, LEGAL_UPDATED, SUPPORT_EMAIL } from "../links"

export default function LegalPage({ document }: { document: LegalDocument }) {
  const currentPath = `/${document.slug}`

  return (
    <div className="content-container border-b border-ink/20 py-10 small:py-16">
      <div className="grid grid-cols-1 gap-10 small:grid-cols-12 small:gap-14">
        <article className="min-w-0 small:col-span-8">
          <header className="flex flex-col gap-3">
            <h1 className="max-w-[20ch] font-display text-h1 font-bold leading-[1.02] tracking-[-0.03em] text-ink">
              {document.title}
            </h1>
            <p className="text-small text-ink/70">
              Last updated <time dateTime="2026-10-23">{LEGAL_UPDATED}</time>
            </p>
            <p className="mt-2 max-w-prose text-lead leading-relaxed text-ink/80">
              {document.intro}
            </p>
          </header>

          <div className="mt-10 flex flex-col gap-9">
            {document.sections.map((section) => (
              <section key={section.heading} className="flex flex-col gap-3">
                <Rule />
                <h2 className="font-display text-h3 font-bold leading-tight text-ink">
                  {section.heading}
                </h2>
                {section.paragraphs?.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="max-w-prose text-body leading-relaxed text-ink/80"
                  >
                    {paragraph}
                  </p>
                ))}
                {section.list?.length ? (
                  <ul className="flex max-w-prose flex-col gap-2 text-body leading-relaxed text-ink/80">
                    {section.list.map((item) => (
                      <li key={item} className="flex gap-3">
                        <span
                          aria-hidden="true"
                          className="mt-2 h-0.5 w-3 shrink-0 bg-ink"
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>

          <div className="mt-12 flex flex-col gap-3 border border-ink p-5">
            <h2 className="font-display text-h3 font-bold text-ink">
              Still have a question?
            </h2>
            <p className="max-w-prose text-body text-ink/80">
              Write to the store and a person reads it, usually within two
              business days.
            </p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="text-body text-riso-blue underline underline-offset-4 hover:text-ink"
            >
              {SUPPORT_EMAIL}
            </a>
          </div>
        </article>

        <aside className="small:col-span-4">
          <nav
            aria-label="Policies"
            className="flex flex-col gap-3 border-t border-ink pt-4 small:sticky small:top-24"
          >
            <h2 className="text-small font-semibold text-ink">Policies</h2>
            <ul className="flex flex-col gap-2 text-small">
              {LEGAL_LINKS.map((link) => {
                const current = link.href === currentPath

                return (
                  <li key={link.href}>
                    {current ? (
                      <span
                        aria-current="page"
                        className="font-semibold text-ink"
                      >
                        {link.label}
                      </span>
                    ) : (
                      <LocalizedClientLink
                        href={link.href}
                        className="text-ink/70 underline-offset-4 hover:text-ink hover:underline"
                      >
                        {link.label}
                      </LocalizedClientLink>
                    )}
                  </li>
                )
              })}
            </ul>
          </nav>
        </aside>
      </div>
    </div>
  )
}
