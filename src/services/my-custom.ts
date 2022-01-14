import { BaseService } from "medusa-interfaces";
import { EntityManager } from "typeorm";
import { EventBusService } from "@medusajs/medusa/dist/services";

class MyCustomService extends BaseService {
    #manager: EntityManager;
    #eventBusService: EventBusService;
    #options: Record<string, unknown>;

    public transactionManager: EntityManager;

    constructor(
        { manager, eventBusService }: { manager: EntityManager; eventBusService: EventBusService },
        options: Record<string, unknown>
    ) {
        super();

        this.#manager = manager;

        this.#options = options;
        this.#eventBusService = eventBusService
    }

    withTransaction(transactionManager: EntityManager): MyCustomService {
        if (!transactionManager) {
            return this;
        }

        const cloned = new MyCustomService(
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

export default MyCustomService;
