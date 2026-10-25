import Image from "next/image"
import { HttpTypes } from "@medusajs/types"

import LocalizedClientLink from "@modules/common/components/localized-client-link"

type HeroProps = {
  product?: HttpTypes.StoreProduct
}

const Hero = ({ product }: HeroProps) => {
  const image = product?.thumbnail ?? product?.images?.[0]?.url

  return (
    <section className="content-container border-b border-ink/20 py-10 small:py-16">
      <div className="grid grid-cols-1 items-center gap-12 small:grid-cols-12 small:gap-10">
        <div className="small:col-span-7">
          {/* Clamped so the longest word still fits on a 320px screen. */}
          <h1 className="max-w-[14ch] break-words font-display text-[clamp(2.375rem,10vw,3.8125rem)] font-bold leading-[0.98] tracking-[-0.045em] text-ink">
            Eight departments. One warehouse.
          </h1>
          <p className="mt-5 max-w-[46ch] text-lead leading-relaxed text-ink/80">
            Electronics, fashion, beauty, home and the weekly grocery run —
            stocked in small quantities and shipped from one place, so the
            stock number on a page is the stock we actually hold.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-4">
            <LocalizedClientLink
              href="/store"
              className="inline-flex min-h-12 items-center border border-riso-blue bg-riso-blue px-5 font-semibold text-stock transition-colors hover:border-ink hover:bg-ink"
            >
              Shop all products
            </LocalizedClientLink>
            <a
              href="#departments"
              className="inline-flex min-h-12 items-center border border-ink px-5 font-semibold text-ink transition-colors hover:bg-ink hover:text-stock"
            >
              Browse departments
            </a>
          </div>
        </div>

        <div className="small:col-span-5">
          {image ? (
            <div className="relative mx-2 my-2">
              <div
                aria-hidden="true"
                className="absolute -left-2 -top-2 h-full w-full border border-riso-pink"
              />
              <div
                aria-hidden="true"
                className="absolute -bottom-2 -right-2 h-full w-full border border-riso-blue"
              />
              <div className="relative aspect-square border border-ink bg-stock p-3">
                <div
                  className="absolute inset-3 border border-ink/20"
                  aria-hidden="true"
                />
                <Image
                  src={image}
                  alt={
                    product?.title
                      ? `${product.title} from DevCart`
                      : "The newest product at DevCart"
                  }
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 42vw"
                  className="object-contain p-6"
                />
                {product?.title && product.handle ? (
                  <LocalizedClientLink
                    href={`/products/${product.handle}`}
                    className="absolute bottom-0 left-0 max-w-[85%] border-r border-t border-ink bg-stock px-3 py-2 text-small font-semibold hover:text-riso-blue"
                  >
                    New in: {product.title}
                  </LocalizedClientLink>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex aspect-square items-end border border-ink bg-riso-yellow p-6">
              <p className="max-w-[13ch] font-display text-display font-bold leading-none tracking-tight text-ink">
                Made to ship.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default Hero
