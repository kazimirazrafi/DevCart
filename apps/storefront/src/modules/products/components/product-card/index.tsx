import Image from "next/image"
import clsx from "clsx"

import { Plate } from "@modules/design-system"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import WishlistButton from "@modules/products/components/wishlist-button"

type ProductCardProps = {
  href: string
  title: string
  thumbnail?: string | null
  price?: React.ReactNode
  meta?: React.ReactNode
  priority?: boolean
  as?: "article" | "div" | "li"
  className?: string
  productId?: string
}

const IMAGE_SIZES = "(max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"

const ProductCard = ({
  href,
  title,
  thumbnail,
  price,
  meta,
  priority,
  as = "article",
  className,
  productId,
}: ProductCardProps) => {
  return (
    <Plate as={as} className={clsx("group", className)}>
      <LocalizedClientLink
        href={href}
        className="flex flex-col focus-visible:outline-offset-[-2px]"
        data-testid="product-wrapper"
      >
        <Plate.Media>
          {thumbnail ? (
            <Image
              src={thumbnail}
              alt={title}
              fill
              sizes={IMAGE_SIZES}
              priority={priority}
              fetchPriority={priority ? "high" : undefined}
              className="object-cover object-center"
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-small text-ink/70">
              No image
            </span>
          )}
        </Plate.Media>
        <Plate.Body>
          <Plate.Title data-testid="product-title">{title}</Plate.Title>
          {price ? <Plate.Price>{price}</Plate.Price> : null}
          {meta ? <Plate.Meta>{meta}</Plate.Meta> : null}
        </Plate.Body>
      </LocalizedClientLink>

      {productId ? (
        <WishlistButton
          productId={productId}
          className="absolute right-2 top-2 z-10 shadow-none"
        />
      ) : null}
    </Plate>
  )
}

export default ProductCard
