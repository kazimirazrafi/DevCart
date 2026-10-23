import { Badge, Button, clx } from "@modules/common/components/ui"
import { useEffect } from "react"

import useToggleState from "@lib/hooks/use-toggle-state"
import { useFormStatus } from "react-dom"

type AccountInfoProps = {
  label: string
  currentInfo: string | React.ReactNode
  isSuccess?: boolean
  isError?: boolean
  errorMessage?: string
  clearState: () => void
  children?: React.ReactNode
  'data-testid'?: string
}

const AccountInfo = ({
  label,
  currentInfo,
  isSuccess,
  isError,
  clearState,
  errorMessage = "An error occurred, please try again",
  children,
  'data-testid': dataTestid
}: AccountInfoProps) => {
  const { state, close, toggle } = useToggleState()

  const { pending } = useFormStatus()

  const handleToggle = () => {
    clearState()
    setTimeout(() => toggle(), 100)
  }

  useEffect(() => {
    if (isSuccess) {
      close()
    }
  }, [isSuccess, close])

  /*
   * These three panels are plain blocks, not disclosures: they are always in
   * the tree and their open/closed look comes from the classes below, driven by
   * this component's own state. They used to be `Disclosure`/`Disclosure.Panel`
   * with `static`, which added nothing but an id Headless UI generates — and
   * those ids drifted between the server render and hydration, so React logged
   * "A tree hydrated but some attributes of the server rendered HTML didn't
   * match the client properties" on `/account/profile` (measured, and
   * intermittent: 2 loads in 36). Without the generated ids there is nothing
   * left to drift.
   */
  return (
    <div className="text-small" data-testid={dataTestid}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-small uppercase text-ink/70">{label}</span>
          <div className="flex flex-1 basis-0 items-center justify-end gap-x-4 break-words">
            {typeof currentInfo === "string" ? (
              <span className="font-semibold text-ink" data-testid="current-info">{currentInfo}</span>
            ) : (
              currentInfo
            )}
          </div>
        </div>
        <div>
          <Button
            variant="secondary"
            className="w-[100px] min-h-[25px] py-1"
            onClick={handleToggle}
            type={state ? "reset" : "button"}
            data-testid="edit-button"
            data-active={state}
          >
            {state ? "Cancel" : "Edit"}
          </Button>
        </div>
      </div>

      {/* Success state */}
      <div
        className={clx(
          "transition-[max-height,opacity] duration-300 ease-in-out overflow-hidden",
          {
            "max-h-[1000px] opacity-100": isSuccess,
            "max-h-0 opacity-0": !isSuccess,
          }
        )}
        data-testid="success-message"
        aria-hidden={!isSuccess}
      >
        <Badge className="p-2 my-4" color="green">
          <span>{label} updated successfully</span>
        </Badge>
      </div>

      {/* Error state  */}
      <div
        className={clx(
          "transition-[max-height,opacity] duration-300 ease-in-out overflow-hidden",
          {
            "max-h-[1000px] opacity-100": isError,
            "max-h-0 opacity-0": !isError,
          }
        )}
        data-testid="error-message"
        aria-hidden={!isError}
      >
        <Badge className="p-2 my-4" color="red">
          <span>{errorMessage}</span>
        </Badge>
      </div>

      {/*
        The editor stays mounted so the panel can animate, which means its
        inputs are still in the DOM while it is closed. `inert` is what keeps
        them out of the tab order and out of the accessibility tree — an
        `aria-hidden` alone left focusable fields hidden from assistive tech
        but still reachable with Tab (axe: "aria-hidden-focus").
      */}
      <div
        className={clx(
          "transition-[max-height,opacity] duration-300 ease-in-out overflow-visible motion-reduce:transition-none",
          {
            "max-h-[1000px] opacity-100": state,
            "max-h-0 opacity-0": !state,
          }
        )}
        inert={!state}
      >
        <div className="flex flex-col gap-y-2 py-4">
          <div>{children}</div>
          <div className="flex items-center justify-end mt-2">
            <Button
              isLoading={pending}
              className="w-full small:max-w-[140px]"
              type="submit"
              data-testid="save-button"
            >
              Save changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AccountInfo
