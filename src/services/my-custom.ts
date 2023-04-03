import { Lifetime } from "awilix"
import { TransactionBaseService } from "@medusajs/utils";
import { IEventBusService } from "@medusajs/types";

export default class MyCustomService extends TransactionBaseService {
  static LIFE_TIME = Lifetime.SCOPED
  protected readonly eventBusService_: IEventBusService

  constructor(
      { eventBusService }: { eventBusService: IEventBusService },
      options: Record<string, unknown>
  ) {
    // @ts-ignore
    super(...arguments)

    this.eventBusService_ = eventBusService
  }
}
