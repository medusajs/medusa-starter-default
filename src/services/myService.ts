import { BaseService } from "medusa-interfaces";
import { EntityManager } from "typeorm";
import { EventBusService } from "@medusajs/medusa/dist/services";

class MyService extends BaseService {
  #manager: EntityManager;
  #eventBusService: EventBusService;
  #options: Record<string, unknown>;

  public transactionManager: EntityManager;

  constructor(
    { manager, eventBusService }: { manager: EntityManager; eventBusService: EventBusService },
    options: Record<string, unknown>
  ) {
    super()

    this.#manager = manager;

    this.#options = options;
    this.#eventBusService = eventBusService
  }

  withTransaction(transactionManager: EntityManager): MyService {
    if (!transactionManager) {
      return this;
    }

    const cloned = new MyService(
      {
        manager: transactionManager,
        eventBusService: this.#eventBusService
      },
      this.#options
    );

    cloned.transactionManager = transactionManager;

    return cloned;
  }
}

export default MyService;
