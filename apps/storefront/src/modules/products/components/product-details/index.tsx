import { HttpTypes } from "@medusajs/types"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { Rule, linkClass } from "@modules/design-system"

const markdownFor = (product: HttpTypes.StoreProduct): string | null => {
  const details = product.metadata?.details

  if (typeof details !== "string") {
    return null
  }

  const trimmed = details.trim()

  return trimmed.length ? trimmed : null
}

type ProductDetailsProps = {
  product: HttpTypes.StoreProduct
}

const ProductDetails = ({ product }: ProductDetailsProps) => {
  const markdown = markdownFor(product)

  if (!markdown) {
    return null
  }

  return (
    <section
      className="content-container border-t border-ink/20 py-10 small:py-14"
      data-testid="product-details"
    >
      <div className="mb-6 flex flex-col gap-4">
        <h2 className="font-display text-h2">Details</h2>
        <Rule weight="heavy" />
      </div>

      {/* Headings step down a level: the product title is the page's h1. */}
      <div className="max-w-[72ch] space-y-4 text-body text-ink/80 [&_img]:h-auto [&_img]:max-w-full [&_img]:border [&_img]:border-ink/20">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h3 className="pt-2 font-display text-h3 text-ink">{children}</h3>
            ),
            h2: ({ children }) => (
              <h3 className="pt-2 font-display text-h3 text-ink">{children}</h3>
            ),
            h3: ({ children }) => (
              <h4 className="pt-2 font-display text-lead text-ink">
                {children}
              </h4>
            ),
            h4: ({ children }) => (
              <h4 className="pt-2 font-display text-lead text-ink">
                {children}
              </h4>
            ),
            p: ({ children }) => <p className="text-pretty">{children}</p>,
            ul: ({ children }) => (
              <ul className="flex list-disc flex-col gap-1 pl-5">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="flex list-decimal flex-col gap-1 pl-5">
                {children}
              </ol>
            ),
            li: ({ children }) => <li className="pl-1">{children}</li>,
            a: ({ children, href }) => (
              <a className={linkClass} href={href}>
                {children}
              </a>
            ),
            strong: ({ children }) => (
              <strong className="font-semibold text-ink">{children}</strong>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-2 border-ink/40 pl-4 text-ink/70">
                {children}
              </blockquote>
            ),
            code: ({ children }) => (
              <code className="font-mono text-small">{children}</code>
            ),
            pre: ({ children }) => (
              <pre className="overflow-x-auto border border-ink/20 p-3 font-mono text-small text-ink">
                {children}
              </pre>
            ),
            hr: () => <Rule />,
            table: ({ children }) => (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-small">
                  {children}
                </table>
              </div>
            ),
            th: ({ children }) => (
              <th className="border border-ink/20 bg-ink/5 px-3 py-2 text-left font-semibold text-ink">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="border border-ink/20 px-3 py-2 align-top">
                {children}
              </td>
            ),
          }}
        >
          {markdown}
        </ReactMarkdown>
      </div>
    </section>
  )
}

export default ProductDetails
