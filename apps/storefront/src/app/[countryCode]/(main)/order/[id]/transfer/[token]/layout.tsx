import { Metadata } from "next"

/* All three transfer pages carry a one-time token, so none may be indexed. */
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
