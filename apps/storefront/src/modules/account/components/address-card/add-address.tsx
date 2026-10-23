"use client"

import { Plus } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import { Button } from "@modules/design-system"
import { useRouter } from "next/navigation"
import { useActionState, useEffect, useState } from "react"

import {
  addCustomerAddress,
  type CustomerAddressState,
} from "@lib/data/customer"
import useToggleState from "@lib/hooks/use-toggle-state"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import Modal from "@modules/common/components/modal"
import AddressForm, {
  emptyAddressForm,
  type AddressFormValues,
} from "./address-form"

const AddAddress = ({
  region,
  addresses,
}: {
  region: HttpTypes.StoreRegion
  addresses: HttpTypes.StoreCustomerAddress[]
}) => {
  const { state, open, close } = useToggleState(false)

  return (
    <>
      <button
        className="flex h-full min-h-[220px] w-full flex-col justify-between border border-dashed border-ink p-5 text-left transition-colors hover:bg-ink/5"
        onClick={open}
        data-testid="add-address-button"
      >
        <span className="flex flex-col gap-1">
          <span className="font-display text-lead font-semibold text-ink">
            Add an address
          </span>
          <span className="text-small text-ink/70">
            Saved addresses can be used at checkout.
          </span>
        </span>
        <Plus aria-hidden="true" />
      </button>

      <Modal isOpen={state} close={close} data-testid="add-address-modal">
        {state && (
          <AddAddressForm
            region={region}
            hasAddresses={addresses.length > 0}
            onClose={close}
          />
        )}
      </Modal>
    </>
  )
}

/**
 * The form only exists while the dialog is open, so every opening starts with a
 * clean action state instead of the errors of an attempt the customer cancelled.
 */
const AddAddressForm = ({
  region,
  hasAddresses,
  onClose,
}: {
  region: HttpTypes.StoreRegion
  hasAddresses: boolean
  onClose: () => void
}) => {
  const router = useRouter()
  // The first saved address becomes the default for both uses, which is what
  // the customer almost always wants and what checkout then prefills from.
  const [values, setValues] = useState<AddressFormValues>(emptyAddressForm)
  const [isDefaultShipping, setIsDefaultShipping] = useState(!hasAddresses)
  const [isDefaultBilling, setIsDefaultBilling] = useState(!hasAddresses)

  const [formState, formAction] = useActionState<
    CustomerAddressState,
    FormData
  >(addCustomerAddress, null)

  const errors =
    formState && !formState.ok ? formState.fields ?? {} : {}

  useEffect(() => {
    if (formState?.ok) {
      router.refresh()
      onClose()
    }
    // The close handler is recreated on every render; the result is the signal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formState])

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target

    setValues((current) => ({ ...current, [name]: value }))
  }

  return (
    <form action={formAction} className="flex w-full flex-col">
      <Modal.Title>
        <h2 className="font-display text-h3 font-bold text-ink">
          Add an address
        </h2>
      </Modal.Title>

      <Modal.Body>
        <div className="flex w-full flex-col gap-4 py-4">
          <AddressForm
            idPrefix="add"
            values={values}
            errors={errors}
            onChange={handleChange}
            region={region}
          />

          <fieldset className="flex flex-col gap-2 border-t border-ink/20 pt-4">
            <legend className="mb-2 text-small font-semibold text-ink">
              Use as default
            </legend>

            <label className="flex items-center gap-2 text-small text-ink">
              <input
                type="checkbox"
                name="is_default_shipping"
                checked={isDefaultShipping}
                onChange={(event) =>
                  setIsDefaultShipping(event.target.checked)
                }
                className="h-4 w-4"
                data-testid="default-shipping-checkbox"
              />
              Default shipping address
            </label>

            <label className="flex items-center gap-2 text-small text-ink">
              <input
                type="checkbox"
                name="is_default_billing"
                checked={isDefaultBilling}
                onChange={(event) =>
                  setIsDefaultBilling(event.target.checked)
                }
                className="h-4 w-4"
                data-testid="default-billing-checkbox"
              />
              Default billing address
            </label>
          </fieldset>

          {formState && !formState.ok && (
            <p
              role="alert"
              className="border-l-2 border-riso-pink pl-3 text-small text-ink"
              data-testid="address-error"
            >
              {formState.message}
            </p>
          )}
        </div>
      </Modal.Body>

      <Modal.Footer>
        <div className="mt-2 flex w-full flex-wrap justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            data-testid="cancel-button"
          >
            Cancel
          </Button>
          <SubmitButton data-testid="save-button">Save address</SubmitButton>
        </div>
      </Modal.Footer>
    </form>
  )
}

export default AddAddress
