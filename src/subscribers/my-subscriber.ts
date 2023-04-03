import MyCustomService from "../services/my-custom";
import { EntityManager } from "typeorm";
import { OrderService } from "@medusajs/medusa";
import { IEventBusService } from "@medusajs/types";

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
      eventBusService: IEventBusService;
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
