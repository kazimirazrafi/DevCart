import { notFound } from "next/navigation"
import React, { Suspense } from "react"

import { HttpTypes } from "@medusajs/types"
import type { ReviewSummary } from "@lib/data/reviews"
import BreadcrumbJsonLd from "@modules/common/components/breadcrumb-json-ld"
import { Rule } from "@modules/design-system"
import ImageGallery from "@modules/products/components/image-gallery"
import ProductActions from "@modules/products/components/product-actions"
import ProductJsonLd from "@modules/products/components/product-json-ld"
import ProductOnboardingCta from "@modules/products/components/product-onboarding-cta"
import ProductReviews from "@modules/products/components/product-reviews"
import ProductTabs from "@modules/products/components/product-tabs"
import RelatedProducts from "@modules/products/components/related-products"
import ProductInfo from "@modules/products/templates/product-info"
import SkeletonRelatedProducts from "@modules/skeletons/templates/skeleton-related-products"

import ProductActionsWrapper from "./product-actions-wrapper"

type ProductTemplateProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  countryCode: string
  images: HttpTypes.StoreProductImage[]
  /** The whole product's rating picture, for the search result's stars. */
  reviewSummary?: ReviewSummary
}

/*
 * Gallery on the left, everything a customer decides with on the right: name,
 * price and stock, options, add to cart, then the spec table
 * (docs/DESIGN.md "Product"). The right column stays put while a long gallery
 * scrolls past it.
 */
const ProductTemplate: React.FC<ProductTemplateProps> = ({
  product,
  region,
  countryCode,
  images,
  reviewSummary,
}) => {
  if (!product || !product.id) {
    return notFound()
  }

  const category = product.categories?.[0]

  /*
   * The trail the product sits in: the shop, its department, then the product.
   * The category is only named when the product actually has one — a product
   * that belongs to nothing still has a valid two-step trail.
   */
  const breadcrumbs = [
    { name: "Home", path: "" },
    { name: "Store", path: "/store" },
    ...(category?.handle
      ? [
          {
            name: category.name ?? "Category",
            path: `/categories/${category.handle}`,
          },
        ]
      : []),
    {
      name: product.title ?? "Product",
      path: `/products/${product.handle}`,
    },
  ]

  return (
    <>
      <ProductJsonLd
        product={product}
        countryCode={countryCode}
        reviewSummary={reviewSummary}
      />
      <BreadcrumbJsonLd countryCode={countryCode} items={breadcrumbs} />

      <div
        className="content-container grid grid-cols-1 gap-10 py-10 small:grid-cols-12 small:gap-12"
        data-testid="product-container"
      >
        <div className="small:col-span-7">
          <ImageGallery images={images} title={product.title ?? undefined} />
        </div>

        <div className="flex flex-col gap-6 small:col-span-5 small:sticky small:top-24 small:self-start">
          <ProductInfo product={product} />
          <ProductOnboardingCta />
          <Suspense
            fallback={
              <ProductActions
                disabled={true}
                product={product}
                region={region}
              />
            }
          >
            <ProductActionsWrapper id={product.id} region={region} />
          </Suspense>
          <Rule />
          <ProductTabs product={product} />
        </div>
      </div>

      <Suspense
        fallback={
          <div className="content-container border-t border-ink/20 py-10 small:py-14">
            <div className="h-8 w-40 animate-pulse bg-ink/10 motion-reduce:animate-none" />
          </div>
        }
      >
        <ProductReviews product={product} countryCode={countryCode} />
      </Suspense>

      <div
        className="content-container border-t border-ink/20 py-10 small:py-14"
        data-testid="related-products-container"
      >
        <Suspense fallback={<SkeletonRelatedProducts />}>
          <RelatedProducts product={product} countryCode={countryCode} />
        </Suspense>
      </div>
    </>
  )
}

export default ProductTemplate
