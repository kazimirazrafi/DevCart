import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

type LinkEmailPassIdentityInput = {
  email: string
}

type LinkEmailPassIdentityOutput = {
  linked: boolean
}

/*
 * A customer who has only ever signed in with Google owns a customer record and
 * a Google auth identity, but no password. Registering with their address (or
 * resetting a password for it) creates a *separate* emailpass auth identity,
 * because Medusa's register route only checks provider identities — it never
 * looks at customers. That identity carries no `app_metadata.customer_id`, so
 * its login token has no actor and `/store/customers/me` rejects it.
 *
 * This step closes that gap, but only for a caller who has just proven they
 * read the address's inbox (see the reset-password workflow): proof is what
 * makes it safe to hand over an existing account. It is deliberately not run on
 * login or registration, where anyone could type someone else's address.
 *
 * The customer keeps the auth identity they signed up with and gains a second
 * one for the password. Medusa resolves the customer from whichever identity a
 * provider authenticated, so both ways in land on the same account.
 */
const linkEmailPassIdentityStep = createStep(
  "link-email-pass-identity",
  async (input: LinkEmailPassIdentityInput, { container }) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const authModule = container.resolve(Modules.AUTH)
    const customerModule = container.resolve(Modules.CUSTOMER)

    const [providerIdentity] = await authModule.listProviderIdentities({
      provider: "emailpass",
      entity_id: input.email,
    })

    if (!providerIdentity?.auth_identity_id) {
      return new StepResponse<LinkEmailPassIdentityOutput>({ linked: false })
    }

    const [customer] = await customerModule.listCustomers({
      email: input.email,
    })

    // No customer yet: Medusa's normal registration flow links the identity
    // when it creates the customer, so there is nothing to reconcile.
    if (!customer) {
      return new StepResponse<LinkEmailPassIdentityOutput>({ linked: false })
    }

    const identity = await authModule.retrieveAuthIdentity(
      providerIdentity.auth_identity_id,
      { select: ["id", "app_metadata"] }
    )

    if (identity.app_metadata?.customer_id) {
      return new StepResponse<LinkEmailPassIdentityOutput>({ linked: false })
    }

    await authModule.updateAuthIdentities({
      id: identity.id,
      app_metadata: {
        ...identity.app_metadata,
        customer_id: customer.id,
      },
    })

    logger.info(
      `Linked the emailpass identity for ${input.email} to customer ${customer.id}.`
    )

    return new StepResponse<LinkEmailPassIdentityOutput>({ linked: true })
  }
)

export const linkEmailPassIdentityWorkflow = createWorkflow(
  "link-email-pass-identity",
  (input: LinkEmailPassIdentityInput) => {
    const result = linkEmailPassIdentityStep(input)

    return new WorkflowResponse(result)
  }
)
