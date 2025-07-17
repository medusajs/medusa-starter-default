import {
  WorkflowData,
  WorkflowResponse,
  createWorkflow,
  createStep,
} from "@medusajs/framework/workflows-sdk"
import { CreateMachineDTO } from "../types"
import { MACHINES_MODULE } from "../index"
import { MachinesModuleService } from "../service"
import { MedusaError } from "@medusajs/framework/utils"

/**
 * Validation step for machine creation input
 */
export const validateMachineInputStep = createStep(
  "validate-machine-input",
  async (data: { machines: CreateMachineDTO[] }) => {
    const { machines } = data

    for (const machine of machines) {
      // Required fields validation removed for name field since it doesn't exist in the model

      if (!machine.model_number?.trim()) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Model number is required"
        )
      }

      if (!machine.serial_number?.trim()) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Serial number is required"
        )
      }

      // Validate year if provided
      if (machine.year !== null && machine.year !== undefined) {
        const currentYear = new Date().getFullYear()
        if (machine.year < 1900 || machine.year > currentYear + 1) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Year must be between 1900 and ${currentYear + 1}`
          )
        }
      }

      // Validate numeric fields
      if (machine.engine_hours !== null && machine.engine_hours !== undefined && machine.engine_hours < 0) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Engine hours cannot be negative"
        )
      }

      if (machine.horsepower !== null && machine.horsepower !== undefined && machine.horsepower < 0) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Horsepower cannot be negative"
        )
      }

      if (machine.weight !== null && machine.weight !== undefined && machine.weight < 0) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Weight cannot be negative"
        )
      }
    }

    return { validated: true }
  }
)

/**
 * Step to check for duplicate serial numbers
 */
export const checkDuplicateSerialNumberStep = createStep(
  "check-duplicate-serial-number",
  async (data: { machines: CreateMachineDTO[] }, { container }) => {
    const machinesService = container.resolve<MachinesModuleService>(MACHINES_MODULE)
    
    for (const machine of data.machines) {
      const existing = await machinesService.listMachines({
        serial_number: machine.serial_number
      })

      if (existing.length > 0) {
        throw new MedusaError(
          MedusaError.Types.DUPLICATE_ERROR,
          `Machine with serial number "${machine.serial_number}" already exists`
        )
      }
    }

    return { checked: true }
  }
)

/**
 * Step to create machines
 */
export const createMachinesStep = createStep(
  "create-machines",
  async (data: { machines: CreateMachineDTO[] }, { container }) => {
    const machinesService = container.resolve<MachinesModuleService>(MACHINES_MODULE)
    
    const created = await machinesService.createMachines(data.machines)
    
    return created
  },
  async (createdMachines, { container }) => {
    if (!createdMachines?.length) {
      return
    }

    const machinesService = container.resolve<MachinesModuleService>(MACHINES_MODULE)
    const machineIds = createdMachines.map(machine => machine.id)
    
    await machinesService.deleteMachines(machineIds)
  }
)

export interface CreateMachineWorkflowInput {
  machines: CreateMachineDTO[]
}

/**
 * Workflow for creating machines with proper validation
 */
export const createMachineWorkflow = createWorkflow(
  "create-machine",
  (input: WorkflowData<CreateMachineWorkflowInput>) => {
    // Validate input data
    validateMachineInputStep({ machines: input.machines })

    // Check for duplicate serial numbers
    checkDuplicateSerialNumberStep({ machines: input.machines })

    // Create the machines
    const createdMachines = createMachinesStep({ machines: input.machines })

    return new WorkflowResponse({
      machines: createdMachines
    })
  }
) 