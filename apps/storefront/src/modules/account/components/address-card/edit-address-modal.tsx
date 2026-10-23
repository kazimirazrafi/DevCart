"use client"

import { PencilSquare as Edit, Trash } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import { Button } from "@modules/design-system"
import { useRouter } from "next/navigation"
import React, { useActionState, useEffect, useState } from "react"

import {
  deleteCustomerAddress,
  setDefaultCustomerAddress,
  updateCustomerAddress,
  type AddressDefaultField,
  type CustomerAddressState,
} from "@lib/data/customer"
import useToggleState from "@lib/hooks/use-toggle-state"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import Modal from "@modules/common/components/modal"
import Spinner from "@modules/common/icons/spinner"
import AddressForm, { addressFormValues } from "./address-form"

type EditAddressProps = {
  region: HttpTypes.StoreRegion
  address: HttpTypes.StoreCustomerAddress
  isActive?: boolean
}

const EditAddress: React.FC<EditAddressProps> = ({
  region,
  address,
  isActive = false,
}) => {
  const router = useRouter()
  const { state, open, close: closeModal } = useToggleState(false)

  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [savingDefault, setSavingDefault] =
    useState<AddressDefaultField | null>(null)
  const [defaultError, setDefaultError] = useState<string | null>(null)

  const close = () => {
    setConfirming(false)
    setDeleteError(null)
    setDefaultError(null)
    closeModal()
  }

  const removeAddress = async () => {
    setDeleting(true)
    setDeleteError(null)

    const result = await deleteCustomerAddress(address.id)

    setDeleting(false)

    if (result.ok) {
      router.refresh()
      return
    }

    setDeleteError(result.message)
  }

  const makeDefault = async (field: AddressDefaultField) => {
    setSavingDefault(field)
    setDefaultError(null)

    const result = await setDefaultCustomerAddress(address.id, field)

    setSavingDefault(null)

    if (result.ok) {
      router.refresh()
      return
    }

    setDefaultError(result.message)
  }

  return (
    <>
      <article
        className={
          "flex h-full min-h-[220px] w-full flex-col justify-between gap-4 border bg-stock p-5 transition-colors " +
          (isActive ? "border-2 border-ink" : "border-ink")
        }
        data-testid="address-container"
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h3
              className="font-display text-lead font-semibold break-words text-ink"
              data-testid="address-name"
            >
              {address.first_name} {address.last_name}
            </h3>
            <div className="flex flex-wrap gap-2">
              {address.is_default_shipping && (
                <span
                  className="bg-ink px-2 py-0.5 text-small font-semibold text-stock"
                  data-testid="default-shipping-badge"
                >
                  Default shipping
                </span>
              )}
              {address.is_default_billing && (
                <span
                  className="bg-ink px-2 py-0.5 text-small font-semibold text-stock"
                  data-testid="default-billing-badge"
                >
                  Default billing
                </span>
              )}
            </div>
          </div>

          <address className="flex flex-col text-small not-italic text-ink">
            {address.company && (
              <span data-testid="address-company">{address.company}</span>
            )}
            <span data-testid="address-address">
              {address.address_1}
              {address.address_2 && <span>, {address.address_2}</span>}
            </span>
            <span data-testid="address-postal-city">
              {address.postal_code}, {address.city}
            </span>
            <span data-testid="address-province-country">
              {address.province && `${address.province}, `}
              {address.country_code?.toUpperCase()}
            </span>
            {address.phone && (
              <span className="mt-1 text-ink/70">{address.phone}</span>
            )}
          </address>

          <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-ink/20 pt-3 text-small">
            {!address.is_default_shipping && (
              <button
                type="button"
                className="underline decoration-1 underline-offset-4 hover:text-riso-blue disabled:cursor-not-allowed disabled:text-ink/40"
                onClick={() => makeDefault("shipping")}
                disabled={savingDefault !== null}
                data-testid="set-default-shipping-button"
              >
                {savingDefault === "shipping"
                  ? "Saving..."
                  : "Make default shipping"}
              </button>
            )}
            {!address.is_default_billing && (
              <button
                type="button"
                className="underline decoration-1 underline-offset-4 hover:text-riso-blue disabled:cursor-not-allowed disabled:text-ink/40"
                onClick={() => makeDefault("billing")}
                disabled={savingDefault !== null}
                data-testid="set-default-billing-button"
              >
                {savingDefault === "billing"
                  ? "Saving..."
                  : "Make default billing"}
              </button>
            )}
            {(address.is_default_shipping || address.is_default_billing) && (
              <span className="text-ink/70">
                Used automatically at checkout.
              </span>
            )}
          </div>

          {defaultError && (
            <p
              role="alert"
              className="border-l-2 border-riso-pink pl-3 text-small text-ink"
              data-testid="default-error"
            >
              {defaultError}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <button
            className="flex items-center gap-x-2 text-small text-ink underline decoration-1 underline-offset-4 hover:text-riso-blue"
            onClick={open}
            data-testid="address-edit-button"
          >
            <Edit aria-hidden="true" />
            Edit
          </button>

          {confirming ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-small">
              <span>Remove this address?</span>
              <button
                type="button"
                className="flex items-center gap-x-2 font-semibold text-ink underline decoration-1 underline-offset-4 hover:text-riso-blue disabled:text-ink/40"
                onClick={removeAddress}
                disabled={deleting}
                data-testid="address-delete-confirm"
              >
                {deleting ? <Spinner /> : <Trash aria-hidden="true" />}
                {deleting ? "Removing..." : "Remove"}
              </button>
              <button
                type="button"
                className="text-ink underline decoration-1 underline-offset-4 hover:text-riso-blue disabled:text-ink/40"
                onClick={() => setConfirming(false)}
                disabled={deleting}
                data-testid="address-delete-cancel"
              >
                Keep
              </button>
            </div>
          ) : (
            <button
              className="flex items-center gap-x-2 text-small text-ink underline decoration-1 underline-offset-4 hover:text-riso-blue"
              onClick={() => setConfirming(true)}
              data-testid="address-delete-button"
            >
              <Trash aria-hidden="true" />
              Remove
            </button>
          )}
        </div>

        {deleteError && (
          <p
            role="alert"
            className="border-l-2 border-riso-pink pl-3 text-small text-ink"
            data-testid="delete-error"
          >
            {deleteError}
          </p>
        )}
      </article>

      <Modal isOpen={state} close={close} data-testid="edit-address-modal">
        {state && (
          <EditAddressForm
            region={region}
            address={address}
            onClose={close}
          />
        )}
      </Modal>
    </>
  )
}

const EditAddressForm = ({
  region,
  address,
  onClose,
}: {
  region: HttpTypes.StoreRegion
  address: HttpTypes.StoreCustomerAddress
  onClose: () => void
}) => {
  const router = useRouter()
  const [values, setValues] = useState(() => addressFormValues(address))

  const [formState, formAction] = useActionState<
    CustomerAddressState,
    FormData
  >(updateCustomerAddress, null)

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
          Edit address
        </h2>
      </Modal.Title>

      <Modal.Body>
        <div className="flex w-full flex-col gap-4 py-4">
          <input type="hidden" name="addressId" value={address.id} />

          <AddressForm
            idPrefix="edit"
            values={values}
            errors={errors}
            onChange={handleChange}
            region={region}
          />

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
          <SubmitButton data-testid="save-button">Save changes</SubmitButton>
        </div>
      </Modal.Footer>
    </form>
  )
}

export default EditAddress
