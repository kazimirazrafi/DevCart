/*
 * A placeholder line for the tables that render order items. It is a table row
 * on purpose: its caller puts it inside `<tbody>`, where anything else would be
 * hoisted out by the HTML parser.
 */
const SkeletonLineItem = () => {
  return (
    <tr className="border-b border-ink/20">
      <td className="w-24 p-4">
        <div className="h-24 w-24 animate-pulse bg-ink/10" />
      </td>
      <td className="text-left">
        <div className="flex flex-col gap-2">
          <div className="h-4 w-32 animate-pulse bg-ink/10" />
          <div className="h-4 w-24 animate-pulse bg-ink/10" />
        </div>
      </td>
      <td>
        <div className="h-10 w-14 animate-pulse bg-ink/10" />
      </td>
      <td>
        <div className="h-6 w-12 animate-pulse bg-ink/10" />
      </td>
      <td>
        <div className="ml-auto h-6 w-12 animate-pulse bg-ink/10" />
      </td>
    </tr>
  )
}

export default SkeletonLineItem
