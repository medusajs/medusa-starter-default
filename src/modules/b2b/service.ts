import {
  InjectManager,
  MedusaContext,
  MedusaError,
  MedusaService,
} from "@medusajs/framework/utils"
import { CartApproval, Company, Employee } from "./models"
import { Context } from "@medusajs/types"

type CreateCompanyInput = {
  name: string
  email: string
  phone?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  country?: string | null
  currency_code: string
  approval_settings?: Record<string, unknown>
  metadata?: Record<string, unknown> | null
}

type UpdateCompanyInput = Partial<CreateCompanyInput> & {
  id: string
}

type CreateEmployeeInput = {
  company_id: string
  customer_id: string
  spending_limit: number
  is_admin: boolean
  metadata?: Record<string, unknown> | null
}

type UpdateEmployeeInput = Partial<CreateEmployeeInput> & {
  id: string
}

type CreateCartApprovalInput = {
  cart_id: string
  requested_by: string
  status?: string
  metadata?: Record<string, unknown> | null
}

class B2BModuleService extends MedusaService({
  Company,
  Employee,
  CartApproval,
}) {

  @InjectManager()
  async createCompany(
    data: CreateCompanyInput,
    @MedusaContext() sharedContext: Context = {}
  ) {
    const payload = {
      ...data,
      approval_settings: data.approval_settings ?? {
        requires_admin_approval: false,
      },
    }

    const [company] = await this.createCompanies([payload], sharedContext)
    return company
  }

  @InjectManager()
  async updateCompany(
    data: UpdateCompanyInput,
    @MedusaContext() sharedContext: Context = {}
  ) {
    const [company] = await this.updateCompanies([data], sharedContext)
    return company
  }

  @InjectManager()
  async createEmployee(
    data: CreateEmployeeInput,
    @MedusaContext() sharedContext: Context = {}
  ) {
    const [employee] = await this.createEmployees(
      [
        {
          ...data,
          company_id: data.company_id,
        },
      ],
      sharedContext
    )
    return employee
  }

  @InjectManager()
  async updateEmployee(
    data: UpdateEmployeeInput,
    @MedusaContext() sharedContext: Context = {}
  ) {
    const [employee] = await this.updateEmployees([data], sharedContext)
    return employee
  }

  @InjectManager()
  async deleteEmployee(
    ids: string | string[],
    @MedusaContext() sharedContext: Context = {}
  ) {
    await this.deleteEmployees(ids, sharedContext)
  }

  @InjectManager()
  async requestCartApproval(
    data: CreateCartApprovalInput,
    @MedusaContext() sharedContext: Context = {}
  ) {
    const [approval] = await this.createCartApprovals(
      [
        {
          ...data,
          status: data.status ?? "pending",
        },
      ],
      sharedContext
    )

    return approval
  }

  @InjectManager()
  async getCartApprovals(
    cartId: string,
    @MedusaContext() sharedContext: Context = {}
  ) {
    return await this.listCartApprovals(
      {
        cart_id: cartId,
      },
      {},
      sharedContext
    )
  }

  async assertCompanyOwnership(companyId: string, customerId: string) {
    const [employee] = await this.listEmployees(
      {
        company_id: companyId,
        customer_id: customerId,
      },
      { take: 1 }
    )

    if (!employee) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "You do not have access to this company."
      )
    }

    return employee
  }
}

export default B2BModuleService
