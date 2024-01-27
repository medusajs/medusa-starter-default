import {
  MedusaContainer,
  OrderService,
  SalesChannelService,
  TransactionBaseService,
} from "@medusajs/medusa";
import { StockLocation } from "@medusajs/stock-location/dist/models";
import StockLocationService from "@medusajs/stock-location/dist/services/stock-location";
import TelegramNotificationService from "medusa-telegram-notification/src/services/telegram-notification";
import { TelegramNotificationSendMessageRequestPayload } from "medusa-telegram-notification/src/types";
import { Lifetime } from "awilix";
import { IEventBusService } from "@medusajs/types";

const MEDUSA_ADMIN_BASE_URL = process.env.MEDUSA_ADMIN_BASE_URL;

export default class TelegramService extends TransactionBaseService {
  static LIFE_TIME = Lifetime.SCOPED;
  private readonly _telegramNotificationService: TelegramNotificationService;
  private readonly _orderService: OrderService;
  private readonly _salesChannelService: SalesChannelService;
  private readonly _stockLocationService: StockLocationService;

  constructor(
    {
      telegramNotificationService,
      orderService,
      salesChannelService,
      stockLocationService,
    }: {
      telegramNotificationService: TelegramNotificationService;
      orderService: OrderService;
      salesChannelService: SalesChannelService;
      stockLocationService: StockLocationService;
    },
    options: Record<string, unknown>
  ) {
    // @ts-ignore
    super(...arguments);

    this._telegramNotificationService = telegramNotificationService;
    this._orderService = orderService;
    this._salesChannelService = salesChannelService;
    this._stockLocationService = stockLocationService;
  }

  public async sendMessageOnOrderPlacedAsync(orderId: string): Promise<void> {
    const order = await this._orderService.retrieve(orderId, {
      relations: ["customer", "shipping_address", "currency"],
    });
    console.log(order);
    const salesChannel = await this._salesChannelService.retrieve(
      order.sales_channel_id,
      { relations: ["locations"] }
    );
    const telegramGroupIds: string[] = [];
    const stockLocationIds = salesChannel.locations.map(
      (value) => value.location_id
    );
    const stockLocationsResponse = await this._stockLocationService.list({
      id: stockLocationIds,
    });
    for (const location of stockLocationsResponse) {
      if (!Object.keys(location.metadata).includes("telegram_group_id")) {
        continue;
      }

      telegramGroupIds.push(location.metadata["telegram_group_id"] as string);
    }

    if (telegramGroupIds.length <= 0) {
      return;
    }

    const customerInfo = `${[order.customer.email, order.customer.phone]
      .filter((e) => e)
      .join(" - ")}`;

    let address = `${order?.shipping_address?.address_1}${
      order?.shipping_address?.address_2 &&
      ", " + order?.shipping_address.address_2
    } ${order?.shipping_address?.city}, ${order?.shipping_address?.province} ${
      order?.shipping_address?.postal_code
    } ${order?.shipping_address?.country_code?.toUpperCase()}`;
    const totalAmount = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: order.currency.code.toUpperCase(),
    }).format(Number((order.total / 100).toFixed(2)));
    const message = `<p>💌 Order <em>#${order.display_id}</em> placed successfully
    📝 Order details: <a href="${MEDUSA_ADMIN_BASE_URL}/a/orders/${order.id}">view</a>
    🍭 Customer: ${customerInfo} (<a href="${MEDUSA_ADMIN_BASE_URL}/a/customers/${order.customer.id}">details</a>)
    💰 Total amount: ${totalAmount}
    🚚 Shipping address: ${address}</p>`;

    const payload: TelegramNotificationSendMessageRequestPayload = {
      chat_ids: telegramGroupIds,
      text: message,
      parse_mode: "HTML",
    };

    this._telegramNotificationService.sendMessage(payload);
  }
}
