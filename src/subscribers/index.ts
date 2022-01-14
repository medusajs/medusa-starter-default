import MyService from "../services/myService";
import { EntityManager } from "typeorm";
import { EventBusService } from "@medusajs/medusa/dist/services";

class MySubscriber {
    #manager: EntityManager;
    #myService: MyService;

    constructor({ manager, eventBusService, myService }: { manager: EntityManager; eventBusService: EventBusService; myService: MyService }) {
        this.#manager = manager;
        this.#myService = myService;

        eventBusService.subscribe("order.placed", this.handleOrderPlaced);
    }

    public async handleOrderPlaced({ id }: { id: string }): Promise<unknown> {
        return true;
    }
}

export default MySubscriber;
