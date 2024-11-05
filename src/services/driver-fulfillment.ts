import {
  AbstractFulfillmentService,
  Cart,
  Fulfillment,
  LineItem,
  Order,
} from "@medusajs/medusa";
import { CreateReturnType } from "@medusajs/medusa/dist/types/fulfillment-provider";

class DriverFulfillmentService extends AbstractFulfillmentService {
  public static identifier = "driver-fulfillment";

  constructor(container, options) {
    super(container);
  }

  public async getFulfillmentOptions(): Promise<any[]> {
    return [
      {
        id: "driver-fulfillment",
      },
    ];
  }

  public async validateFulfillmentData(
    optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    cart: Cart
  ): Promise<Record<string, unknown>> {
    if (data.id !== "driver-fulfillment") {
      throw new Error("invalid data");
    }

    return {
      ...data,
    };
  }

  public async validateOption(data: Record<string, unknown>): Promise<boolean> {
    return data.id == "driver-fulfillment";
  }

  public async canCalculate(data: Record<string, unknown>): Promise<boolean> {
    return data.id === "driver-fulfillment-dynamic";
  }

  public async calculatePrice(
    optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    cart: Cart
  ): Promise<number> {
    return cart.items.length * 1000;
  }

  public async createFulfillment(
    data: Record<string, unknown>,
    items: LineItem[],
    order: Order,
    fulfillment: Fulfillment
  ) {
    // No data is being sent anywhere
    // No data to be stored in the fulfillment's data object
    return {};
  }

  public async cancelFulfillment(
    fulfillment: Record<string, unknown>
  ): Promise<any> {
    return {};
  }

  public async createReturn(
    returnOrder: CreateReturnType
  ): Promise<Record<string, unknown>> {
    return {};
  }

  public async getFulfillmentDocuments(
    data: Record<string, unknown>
  ): Promise<any> {
    // assuming you contact a client to
    // retrieve the document
    return {};
  }

  public async getReturnDocuments(data: Record<string, unknown>): Promise<any> {
    // assuming you contact a client to
    // retrieve the document
    return {};
  }

  public async getShipmentDocuments(
    data: Record<string, unknown>
  ): Promise<any> {
    // assuming you contact a client to
    // retrieve the document
    return {};
  }

  public async retrieveDocuments(
    fulfillmentData: Record<string, unknown>,
    documentType: "invoice" | "label"
  ): Promise<any> {
    // assuming you contact a client to
    // retrieve the document
    return {};
  }
}

export default DriverFulfillmentService;
