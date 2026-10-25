import { SUPPORT_EMAIL } from "@modules/legal/links"

const QUESTIONS = [
  {
    question: "When will my order ship?",
    answer:
      "Orders leave our warehouse within two business days. Standard delivery then takes two to three business days, and express arrives within 24 hours of despatch.",
  },
  {
    question: "What does shipping cost?",
    answer:
      "The standard and express rates for your country are shown at checkout before you pay. Shipping is charged once per order, not per item.",
  },
  {
    question: "What can I send back?",
    answer:
      "Anything unused and in its original packaging within 30 days of delivery. Write to us with the order number and we will send the return instructions; refunds go back to the original payment method within 14 days of the parcel arriving.",
  },
  {
    question: "How do I track an order?",
    answer:
      "The despatch email carries the tracking number. Signed-in customers can also follow every order under Orders in their account.",
  },
  {
    question: "Do you ship to my country?",
    answer:
      "The country menu in the header lists every region the store delivers to. If your country is not there, we do not ship there yet.",
  },
  {
    question: "Can I change the delivery address after ordering?",
    answer:
      "Usually, if the parcel has not left the warehouse. Write to us as soon as you notice with the order number and the correct address.",
  },
]

export default function Faq() {
  return (
    <section
      aria-labelledby="faq-heading"
      className="content-container border-b border-ink/20 py-10 small:py-14"
      id="faq"
      data-testid="faq"
    >
      <div className="grid grid-cols-1 gap-8 small:grid-cols-12">
        <div className="small:col-span-4">
          <h2
            id="faq-heading"
            className="font-display text-h2 font-bold tracking-tight"
          >
            Questions we get
          </h2>
          <p className="mt-3 max-w-[34ch] text-small text-ink/70">
            If yours is not here, write to{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="text-riso-blue underline underline-offset-4 hover:text-ink"
            >
              {SUPPORT_EMAIL}
            </a>{" "}
            and a person will answer within two business days.
          </p>
        </div>

        <div className="border-t border-ink/20 small:col-span-8">
          {QUESTIONS.map((item) => (
            <details
              key={item.question}
              className="group border-b border-ink/20"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-body font-semibold text-ink marker:content-none [&::-webkit-details-marker]:hidden">
                {item.question}
                <span aria-hidden="true" className="relative h-4 w-4 shrink-0">
                  <span className="absolute left-0 top-1/2 h-px w-4 -translate-y-1/2 bg-ink" />
                  <span className="absolute left-1/2 top-0 h-4 w-px -translate-x-1/2 bg-ink transition-transform group-open:rotate-90" />
                </span>
              </summary>
              <p className="max-w-prose pb-5 text-body text-ink/80">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
