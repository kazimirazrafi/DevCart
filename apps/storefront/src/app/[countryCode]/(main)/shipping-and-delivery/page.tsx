import { Metadata } from "next"

import { pageMetadata } from "@lib/util/seo"
import { getLegalDocument } from "@modules/legal/content"
import LegalPage from "@modules/legal/templates/legal-page"

const document = getLegalDocument("shipping-and-delivery")!

export async function generateMetadata(props: {
  params: Promise<{ countryCode: string }>
}): Promise<Metadata> {
  const { countryCode } = await props.params

  return pageMetadata({
    countryCode,
    path: "/shipping-and-delivery",
    title: document.title,
    description: document.description,
  })
}

export default function ShippingPage() {
  return <LegalPage document={document} />
}
