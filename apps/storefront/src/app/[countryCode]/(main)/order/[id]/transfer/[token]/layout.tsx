import { Metadata } from "next"

/*
 * All three transfer pages (the form, accept and decline) are reached from a
 * link carrying a one-time token, so none of them may be crawled or followed.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function OrderTransferLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
