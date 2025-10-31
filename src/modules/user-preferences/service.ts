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
import UserPreference from "./models/user-preferences"
import { UserPreferencesDTO, CreateUserPreferencesDTO, UpdateUserPreferencesDTO, FilterableUserPreferencesProps } from "./types"

type InjectedDependencies = {
  baseRepository: DAL.RepositoryService
  userPreferenceService: ModulesSdkTypes.IMedusaInternalService<any>
}

export default class UserPreferencesService
  extends MedusaService<{
    UserPreference: { dto: UserPreferencesDTO }
  }>({
    UserPreference,
  })
{
  protected baseRepository_: DAL.RepositoryService
  protected userPreferenceService_: ModulesSdkTypes.IMedusaInternalService<
    InferEntityType<typeof UserPreference>
  >

  constructor(
    {
      baseRepository,
      userPreferenceService,
    }: InjectedDependencies,
    protected readonly moduleDeclaration: InternalModuleDeclaration
  ) {
    // @ts-ignore
    super(...arguments)

    this.baseRepository_ = baseRepository
    this.userPreferenceService_ = userPreferenceService
  }

  async getUserPreferences(
    userId: string,
    @MedusaContext() sharedContext: Context = {}
  ): Promise<UserPreferencesDTO | null> {
    const preferences = await this.listUserPreference(
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
      const [updated] = await this.updateUserPreference(
        [{ id: existing.id, ...data }],
        sharedContext
      )
      return updated
    } else {
      const [created] = await this.createUserPreference(
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