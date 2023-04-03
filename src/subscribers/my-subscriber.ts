import MyCustomService from "../services/my-custom";
import { EntityManager } from "typeorm";
import { EventBusService, OrderService } from "@medusajs/medusa";

export default class MySubscriber {
  protected readonly manager_: EntityManager;
  protected readonly myCustomService_: MyCustomService

  constructor(
    {
      manager,
      eventBusService,
      myCustomService,
    }: {
      manager: EntityManager;
      eventBusService: EventBusService;
      myCustomService: MyCustomService;
    }
  ) {
    this.manager_ = manager;
    this.myCustomService_ = myCustomService;

    eventBusService.subscribe(OrderService.Events.PLACED, this.handleOrderPlaced);
  }

  handleOrderPlaced = async (data): Promise<any> => {
    return true;
  }
}
