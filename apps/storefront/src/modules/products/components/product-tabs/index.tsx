"use client"

import { HttpTypes } from "@medusajs/types"

import Accordion from "./accordion"

type ProductTabsProps = {
  product: HttpTypes.StoreProduct
}

const ProductTabs = ({ product }: ProductTabsProps) => {
  const tabs = [
    {
      label: "Product information",
      component: <ProductInfoTab product={product} />,
    },
    {
      label: "Shipping and returns",
      component: <ShippingInfoTab />,
    },
  ]

  return (
    <div className="w-full">
      <Accordion type="multiple">
        {tabs.map((tab) => (
          <Accordion.Item key={tab.label} title={tab.label} value={tab.label}>
            {tab.component}
          </Accordion.Item>
        ))}
      </Accordion>
    </div>
  )
}

/*
 * Specs are facts, so they are set as a definition list and the values are
 * mono, the one place in this design that is allowed to look like a data sheet
 * (docs/DESIGN.md §3). A field with no value is left out rather than shown as
 * a dash.
 */
const ProductInfoTab = ({ product }: ProductTabsProps) => {
  const specs: { term: string; value: string | null | undefined }[] = [
    { term: "Material", value: product.material },
    { term: "Country of origin", value: product.origin_country },
    { term: "Type", value: product.type?.value },
    { term: "Weight", value: product.weight ? `${product.weight} g` : null },
    {
      term: "Dimensions",
      value:
        product.length && product.width && product.height
          ? `${product.length}L x ${product.width}W x ${product.height}H`
          : null,
    },
  ].filter((spec) => spec.value)

  if (!specs.length) {
    return (
      <p className="text-small text-ink/70">
        Detailed specifications for this product are not published yet.
      </p>
    )
  }

  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-2 small:grid-cols-2">
      {specs.map((spec) => (
        <div key={spec.term} className="flex items-baseline justify-between gap-4 border-b border-ink/10 py-1">
          <dt className="text-small text-ink/70">{spec.term}</dt>
          <dd className="font-mono text-small text-ink">{spec.value}</dd>
        </div>
      ))}
    </dl>
  )
}

const ShippingInfoTab = () => {
  return (
    <div className="flex flex-col gap-4 text-small text-ink/80">
      <p>
        Orders ship from our print partner within two business days and arrive
        in three to five business days.
      </p>
      <p>
        If the fit is not right, send it back within 30 days and we will
        exchange it or refund it.
      </p>
    </div>
  )
}

export default ProductTabs
