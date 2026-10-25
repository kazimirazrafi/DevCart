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
