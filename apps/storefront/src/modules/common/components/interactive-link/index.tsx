import { ArrowUpRightMini } from "@medusajs/icons"
import { Text } from "@modules/common/components/ui"
import LocalizedClientLink from "../localized-client-link"
type InteractiveLinkProps = {
  href: string
  children?: React.ReactNode
  onClick?: () => void
}

const InteractiveLink = ({
  href,
  children,
  onClick,
  ...props
}: InteractiveLinkProps) => {
  return (
    <LocalizedClientLink
      className="flex gap-x-1 items-center group"
      href={href}
      onClick={onClick}
      {...props}
    >
      <Text className="text-riso-blue">{children}</Text>
      <ArrowUpRightMini
        className="text-riso-blue group-hover:rotate-45 ease-in-out duration-150 motion-reduce:transition-none"
        color="currentColor"
      />
    </LocalizedClientLink>
  )
}

export default InteractiveLink
