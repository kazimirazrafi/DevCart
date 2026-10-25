"use client"

import { useState } from "react"

import { sdk } from "@lib/config"
import { Button } from "@modules/design-system"

type Status = "idle" | "sending" | "done" | "error"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const Newsletter = () => {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<Status>("idle")
  const [message, setMessage] = useState<string | null>(null)

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const value = email.trim()

    if (!EMAIL_PATTERN.test(value)) {
      setStatus("error")
      setMessage("Enter an email address we can send to, like name@example.com.")
      return
    }

    setStatus("sending")
    setMessage(null)

    try {
      await sdk.client.fetch("/store/newsletter", {
        method: "POST",
        body: { email: value },
      })
      setStatus("done")
      setMessage("You're on the list. The next drop lands in your inbox.")
      setEmail("")
    } catch (error) {
      setStatus("error")
      // A rate limit already carries a customer-facing message with its wait.
      const apiMessage = error instanceof Error ? error.message : ""
      setMessage(
        /too many/i.test(apiMessage)
          ? apiMessage
          : "That did not go through. Check the address and try again in a moment."
      )
      console.error("Newsletter signup failed", error)
    }
  }

  return (
    <section
      aria-labelledby="newsletter-heading"
      className="border-b border-ink/20 bg-ink text-stock"
      data-testid="newsletter"
    >
      <div className="content-container grid grid-cols-1 gap-8 py-12 small:grid-cols-12 small:items-end small:py-16">
        <div className="small:col-span-6">
          <h2
            id="newsletter-heading"
            className="font-display text-h1 font-bold leading-[1.02] tracking-[-0.03em]"
          >
            Get the drop list
          </h2>
          <p className="mt-4 max-w-[44ch] text-lead leading-relaxed text-stock/80">
            New arrivals and price cuts, twice a month. No cart reminders, no
            daily mail.
          </p>
        </div>

        <div className="small:col-span-6">
          <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
            <label
              htmlFor="newsletter-email"
              className="text-small font-semibold text-stock"
            >
              Email address
            </label>
            <div className="flex flex-col gap-3 small:flex-row">
              <input
                id="newsletter-email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  if (status !== "idle") {
                    setStatus("idle")
                    setMessage(null)
                  }
                }}
                placeholder="name@example.com"
                aria-invalid={status === "error" ? true : undefined}
                className="h-14 w-full rounded-square border border-stock/40 bg-transparent px-4 text-body text-stock placeholder:text-stock/60 focus:border-stock small:w-auto small:flex-1"
                data-testid="newsletter-email"
              />
              <Button
                type="submit"
                variant="secondary"
                size="large"
                className="border-stock text-stock hover:bg-stock hover:text-ink"
                loading={status === "sending"}
                data-testid="newsletter-submit"
              >
                Join the list
              </Button>
            </div>
            <p
              id="newsletter-message"
              role={status === "error" ? "alert" : undefined}
              aria-live="polite"
              className={
                status === "error"
                  ? "text-small text-stock"
                  : "text-small text-stock/80"
              }
              data-testid="newsletter-message"
            >
              {message ?? "We send twice a month and never share the list."}
            </p>
          </form>
        </div>
      </div>
    </section>
  )
}

export default Newsletter
