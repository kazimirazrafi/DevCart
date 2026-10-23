import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * The strip above the homepage: what a first-time visitor needs before they
 * read anything else — how it is shipped, how fast it leaves, and how long they
 * have to send something back. One line, three facts, no rotating carousel.
 *
 * No delivery threshold is claimed here: the store's shipping options are a
 * flat price per region, so "free over $X" would contradict the checkout.
 */
const FACTS = ["Ships in 2 business days", "30-day returns", "One warehouse"]

export default function AnnouncementBar() {
  return (
    <div className="bg-ink text-stock" data-testid="announcement-bar">
      <div className="content-container flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-2 text-small">
        <p className="font-semibold">
          A department store run like a print shop.
        </p>
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {FACTS.map((fact, index) => (
            <li key={fact} className="flex items-center gap-4">
              {index > 0 ? (
                <span aria-hidden="true" className="text-stock/60">
                  /
                </span>
              ) : null}
              <span>{fact}</span>
            </li>
          ))}
          <li className="flex items-center gap-4">
            <span aria-hidden="true" className="text-stock/60">
              /
            </span>
            <LocalizedClientLink
              href="/collections/new-arrivals"
              className="underline underline-offset-4 hover:text-stock/80"
            >
              Shop new arrivals
            </LocalizedClientLink>
          </li>
        </ul>
      </div>
    </div>
  )
}
