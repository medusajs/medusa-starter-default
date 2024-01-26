import {
  MedusaContainer,
  OrderService,
  TransactionBaseService,
} from "@medusajs/medusa";
import TelegramNotificationService from "medusa-telegram-notification/src/services/telegram-notification";
import { TelegramNotificationSendMessageRequestPayload } from "medusa-telegram-notification/src/types";

const MEDUSA_ADMIN_BASE_URL = process.env.MEDUSA_ADMIN_BASE_URL;

class TelegramService extends TransactionBaseService {
  private readonly _telegramNotificationService: TelegramNotificationService;
  private readonly _orderService: OrderService;

  constructor(container: MedusaContainer) {
    super(container);

    this._telegramNotificationService = container.resolve(
      "telegramNotificationService"
    );
    this._orderService = container.resolve("orderService");
  }

  public async sendMessageOnOrderPlacedAsync(orderId: string): Promise<void> {
    const order = await this._orderService.retrieve(orderId, {
      relations: [
        "cart",
        "customer",
        "shipping_address",
        "region",
        "currency",
        "shipping_methods",
        "payments",
        "sales_channel",
        "sales_channels",
      ],
    });
    const telegramGroupId: string =
      Object.keys(order.sales_channel.metadata).includes("telegram_group_id") &&
      (order.sales_channel.metadata["telegram_group_id"] as string);
    if (!telegramGroupId) {
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
    }).format(order.paid_total);
    const message = [
      `💌 Order *#${order.display_id}* placed successfully`,
      `📝 Order details: [view](${MEDUSA_ADMIN_BASE_URL}/a/orders/${order.id})`,
      `🍭 Customer: ${customerInfo} ([details](${MEDUSA_ADMIN_BASE_URL}/a/customers/${order.customer.id}))`,
      `💰 Total amount: ${totalAmount.toString()}`,
      `🚚 Shipping address: ${address}`,
    ].join("\n");

    const payload: TelegramNotificationSendMessageRequestPayload = {
      chat_ids: [telegramGroupId],
      text: message,
      parse_mode: "Markdown",
    };

    this._telegramNotificationService.sendMessage(payload);
  }
}

export default TelegramService;
