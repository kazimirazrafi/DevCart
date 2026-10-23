import { Metadata } from "next"

import { pageMetadata } from "@lib/util/seo"
import { getLegalDocument } from "@modules/legal/content"
import LegalPage from "@modules/legal/templates/legal-page"

const document = getLegalDocument("cookie-policy")!

export async function generateMetadata(props: {
  params: Promise<{ countryCode: string }>
}): Promise<Metadata> {
  const { countryCode } = await props.params

  return pageMetadata({
    countryCode,
    path: "/cookie-policy",
    title: document.title,
    description: document.description,
  })
}

export default function CookiePolicyPage() {
  return <LegalPage document={document} />
}
