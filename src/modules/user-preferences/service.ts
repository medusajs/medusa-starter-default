import {
  Context,
  DAL,
  InferEntityType,
  InternalModuleDeclaration,
  ModuleJoinerConfig,
  ModulesSdkTypes,
} from "@medusajs/framework/types"
import {
  InjectManager,
  InjectTransactionManager,
  MedusaContext,
  MedusaError,
  MedusaService,
} from "@medusajs/framework/utils"
import UserPreferences from "./models/user-preferences"
import { UserPreferencesDTO, CreateUserPreferencesDTO, UpdateUserPreferencesDTO, FilterableUserPreferencesProps } from "./types"

type InjectedDependencies = {
  baseRepository: DAL.RepositoryService
  userPreferencesService: ModulesSdkTypes.IMedusaInternalService<any>
}

export default class UserPreferencesService
  extends MedusaService<{
    UserPreferences: { dto: UserPreferencesDTO }
  }>({
    UserPreferences,
  })
{
  protected baseRepository_: DAL.RepositoryService
  protected userPreferencesService_: ModulesSdkTypes.IMedusaInternalService<
    InferEntityType<typeof UserPreferences>
  >

  constructor(
    {
      baseRepository,
      userPreferencesService,
    }: InjectedDependencies,
    protected readonly moduleDeclaration: InternalModuleDeclaration
  ) {
    // @ts-ignore
    super(...arguments)

    this.baseRepository_ = baseRepository
    this.userPreferencesService_ = userPreferencesService
  }

  async getUserPreferences(
    userId: string,
    @MedusaContext() sharedContext: Context = {}
  ): Promise<UserPreferencesDTO | null> {
    const preferences = await this.listUserPreferences(
      { user_id: userId },
      {},
      sharedContext
    )
    return preferences[0] || null
  }

  async createOrUpdateUserPreferences(
    userId: string,
    data: Partial<CreateUserPreferencesDTO>,
    @MedusaContext() sharedContext: Context = {}
  ): Promise<UserPreferencesDTO> {
    const existing = await this.getUserPreferences(userId, sharedContext)
    
    if (existing) {
      const [updated] = await this.updateUserPreferences(
        [{ id: existing.id, ...data }],
        sharedContext
      )
      return updated
    } else {
      const [created] = await this.createUserPreferences(
        [{ user_id: userId, language: "en", ...data }],
        sharedContext
      )
      return created
    }
  }

  async getUserLanguage(
    userId: string,
    @MedusaContext() sharedContext: Context = {}
  ): Promise<string> {
    const preferences = await this.getUserPreferences(userId, sharedContext)
    return preferences?.language || "en"
  }
} 