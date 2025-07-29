import {
  WorkflowData,
  WorkflowResponse,
  createWorkflow,
} from "@medusajs/framework/workflows-sdk"
import { CreateRentalOrderDTO } from "../types"
import { validateRentalInputStep } from "../steps/validate-rental-input"
import { checkMachineAvailabilityStep } from "../steps/check-machine-availability"
import { createRentalOrderStep } from "../steps/create-rental-order"

export interface CreateRentalOrderWorkflowInput {
  rental: CreateRentalOrderDTO
}

export const createRentalOrderWorkflow = createWorkflow(
  "create-rental-order",
  (input: WorkflowData<CreateRentalOrderWorkflowInput>) => {
    // Validate input data
    validateRentalInputStep({ rental: input.rental })

    // Check machine availability
    checkMachineAvailabilityStep({ rental: input.rental })

    // Create the rental order
    const createdRental = createRentalOrderStep({ rental: input.rental })

    return new WorkflowResponse({
      rental: createdRental
    })
  }
)