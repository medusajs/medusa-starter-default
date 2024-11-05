import { CartDTO, CartLineItemDTO, CreateOrderReturnDTO, FulfillmentDTO, OrderDTO } from "@medusajs/framework/types";
import { MedusaService } from "@medusajs/framework/utils"

class DriverFulfillmentService extends MedusaService({}) {
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
    cart: CartDTO
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
    cart: CartDTO
  ): Promise<number> {
    return cart.items.length * 1000;
  }

  public async createFulfillment(
    data: Record<string, unknown>,
    items: CartLineItemDTO,
    order: OrderDTO,
    fulfillment: FulfillmentDTO
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
    returnOrder: CreateOrderReturnDTO
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
