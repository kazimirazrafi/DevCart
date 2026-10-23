/**
 * Five stars, filled to `rating`.
 *
 * The glyphs are decoration: the meaning is in the `aria-label`, so a screen
 * reader hears "4 out of 5 stars" instead of five characters. `Math.round` on
 * the filled count keeps a 4.5 average (or any fractional number) legible.
 */
const Stars = ({
  rating,
  className,
  size = "body",
}: {
  rating: number
  className?: string
  size?: "small" | "body" | "display"
}) => {
  const filled = Math.round(Math.min(Math.max(rating, 0), 5))

  return (
    <span
      role="img"
      aria-label={`${rating} out of 5 stars`}
      className={[
        "inline-flex items-center gap-0.5 leading-none",
        size === "small"
          ? "text-small"
          : size === "display"
            ? "text-h2"
            : "text-body",
        className ?? "",
      ].join(" ")}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          aria-hidden="true"
          className={star <= filled ? "text-ink" : "text-ink/20"}
        >
          ★
        </span>
      ))}
    </span>
  )
}

export default Stars
