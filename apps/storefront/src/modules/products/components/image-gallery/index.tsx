"use client"

import clsx from "clsx"
import Image from "next/image"
import { useState } from "react"

import { HttpTypes } from "@medusajs/types"

type ImageGalleryProps = {
  images: HttpTypes.StoreProductImage[]
  title?: string
}

const ImageGallery = ({ images, title }: ImageGalleryProps) => {
  const [selectedId, setSelectedId] = useState(images[0]?.id)
  const selected = images.find((image) => image.id === selectedId) ?? images[0]

  if (!images.length) {
    return (
      <div
        className="aspect-square w-full border border-ink/30 bg-ink/5"
        aria-hidden="true"
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        id={selected?.id}
        className="relative aspect-square w-full overflow-hidden border border-ink/30 bg-stock"
        data-testid="product-image"
      >
        {selected?.url && (
          <Image
            src={selected.url}
            alt={title ? `${title} — image ${images.indexOf(selected) + 1}` : "Product image"}
            priority
            fill
            sizes="(max-width: 1024px) 100vw, 55vw"
            className="object-cover object-center"
          />
        )}
      </div>

      {images.length > 1 && (
        <ul className="grid grid-cols-4 gap-3 small:grid-cols-5" data-testid="product-thumbnails">
          {images.map((image, index) => {
            const isSelected = image.id === selected?.id

            return (
              <li key={image.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(image.id)}
                  aria-label={`Show image ${index + 1} of ${images.length}`}
                  aria-pressed={isSelected}
                  className={clsx(
                    "relative block aspect-square w-full overflow-hidden border bg-stock transition-colors",
                    isSelected
                      ? "border-ink"
                      : "border-ink/30 hover:border-ink focus-visible:border-ink"
                  )}
                  data-testid="product-thumbnail"
                >
                  {image.url && (
                    // Decorative: the button above carries the label.
                    <Image
                      src={image.url}
                      alt=""
                      fill
                      sizes="(max-width: 1024px) 25vw, 120px"
                      className="object-cover object-center"
                    />
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default ImageGallery
