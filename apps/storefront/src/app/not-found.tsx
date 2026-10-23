import { ArrowUpRightMini } from "@medusajs/icons"
import { Text } from "@modules/common/components/ui"
import { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "404",
  description: "Something went wrong",
}

export default function NotFound() {
  return (
    /*
     * A page outside every route group (Next renders this without the (main)
     * or (checkout) layout), so its content is the document's `main`.
     */
    <main
      id="main"
      tabIndex={-1}
      className="flex flex-col gap-4 items-center justify-center min-h-[calc(100vh-64px)]"
    >
      <h1 className="font-display text-h2 text-ink">Page not found</h1>
      <p className="text-small text-ink">
        The page you tried to access does not exist.
      </p>
      <Link className="flex gap-x-1 items-center group" href="/">
        <Text className="text-riso-blue">Go to frontpage</Text>
        <ArrowUpRightMini
          className="text-riso-blue group-hover:rotate-45 ease-in-out duration-150 motion-reduce:transition-none"
          color="currentColor"
        />
      </Link>
    </main>
  )
}
