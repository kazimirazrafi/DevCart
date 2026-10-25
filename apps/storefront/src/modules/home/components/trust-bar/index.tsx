export default function TrustBar({
  productCount,
  averageRating,
  reviewCount,
}: {
  productCount: number
  averageRating: number | null
  reviewCount: number
}) {
  const facts = [
    {
      value: productCount.toLocaleString("en-US"),
      label: "products in stock across eight departments",
    },
    {
      value:
        averageRating === null ? "New" : `${averageRating.toFixed(1)} / 5`,
      label:
        reviewCount > 0
          ? `average rating from ${reviewCount.toLocaleString("en-US")} ratings`
          : "average rating, gathered from customer ratings",
    },
    { value: "2 days", label: "from order to despatch, every order" },
    { value: "30 days", label: "to return anything that is not right" },
  ]

  return (
    <section
      aria-label="Why buy here"
      className="border-b border-ink/20"
      data-testid="trust-bar"
    >
      <ul className="content-container grid grid-cols-1 border-l border-t border-ink/20 small:grid-cols-2 medium:grid-cols-4">
        {facts.map((fact) => (
          <li
            key={fact.label}
            className="flex flex-col gap-1 border-b border-r border-ink/20 px-4 py-5"
          >
            <span className="font-display text-h3 font-bold leading-none">
              {fact.value}
            </span>
            <span className="max-w-[28ch] text-small text-ink/70">
              {fact.label}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
