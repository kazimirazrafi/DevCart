import { Metadata } from "next"
import { notFound } from "next/navigation"

import { getRegion } from "@lib/data/regions"
import { pageMetadata } from "@lib/util/seo"
import StoreTemplate from "@modules/store/templates"

/*
 * The listing is now server-rendered by InstantSearchNext, so it has to be
 * built per request: the results depend on the URL's search state and on the
 * catalogue, not on the build.
 */
export const dynamic = "force-dynamic"

export async function generateMetadata(props: {
  params: Promise<{ countryCode: string }>
}): Promise<Metadata> {
  const { countryCode } = await props.params

  return pageMetadata({
    countryCode,
    path: "/store",
    title: "All products",
    description:
      "The full DevCart catalogue: apparel and desk objects for people who build software.",
  })
}

export default async function StorePage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const region = await getRegion(countryCode)

  if (!region) {
    notFound()
  }

  return <StoreTemplate currencyCode={region.currency_code} />
}
