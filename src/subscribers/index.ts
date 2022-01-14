import MyCustomService from "../services/my-custom";
import { EntityManager } from "typeorm";
import { EventBusService } from "@medusajs/medusa/dist/services";
import MyCustomService2 from "../services/my-custom2";

class MySubscriber {
    #manager: EntityManager;
    #myCustom: MyCustomService;
    #myCustom2: MyCustomService2;

    constructor(
        {
            manager,
            eventBusService,
            myCustomService,
            myCustom2Service
        }: {
            manager: EntityManager;
            eventBusService: EventBusService;
            myCustomService: MyCustomService;
            myCustom2Service: MyCustomService2
        }
    ) {
        this.#manager = manager;
        this.#myCustom = myCustomService;
        this.#myCustom2 = myCustom2Service;

        eventBusService.subscribe("order.placed", this.handleOrderPlaced);
    }

    public async handleOrderPlaced({ id }: { id: string }): Promise<unknown> {
        return true;
    }
}

export default MySubscriber;
