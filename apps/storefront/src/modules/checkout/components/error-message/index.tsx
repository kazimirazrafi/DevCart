const ErrorMessage = ({
  error,
  "data-testid": dataTestid,
}: {
  error?: string | null
  "data-testid"?: string
}) => {
  if (!error) {
    return null
  }

  /*
   * Ink words behind a riso-pink rule. Pink is a marker here, not text: at this
   * size it fails AA as a foreground (docs/DESIGN.md §2.1), and it still reads
   * as "something is wrong" without shouting in red.
   */
  return (
    <p
      role="alert"
      className="border-l-2 border-riso-pink pl-3 text-small text-ink"
      data-testid={dataTestid}
    >
      {error}
    </p>
  )
}

export default ErrorMessage
