import { Order } from "@medusajs/medusa";
import {} from "@medusajs/utils";
import { BaseService } from "medusa-interfaces";

const MEDUSA_ADMIN_BASE_URL = process.env.MEDUSA_ADMIN_BASE_URL;

class TelegramService extends BaseService {
  private readonly _telegramNotificationService;

  constructor({ telegramNotificationService }) {
    super();

    this._telegramNotificationService = telegramNotificationService;
  }

  public sendMessage(order: Order): void {
    const telegramGroupId =
      Object.keys(order.sales_channel.metadata).includes("telegram_group_id") &&
      order.sales_channel.metadata["telegram_group_id"];
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
      currency: order.currency.code,
    }).format(order.paid_total);
    const message = [
      `💌 Order *#${order.display_id}* placed successfully`,
      `📝 Order details: [view](${MEDUSA_ADMIN_BASE_URL}/a/orders/${order.id})`,
      `🍭 Customer: ${customerInfo} ([details](${MEDUSA_ADMIN_BASE_URL}/a/customers/${order.customer.id}))`,
      `💰 Total amount: ${totalAmount.toString()}`,
      `🚚 Shipping address: ${address}`,
    ].join("\n");

    const payload = {
      chat_ids: [telegramGroupId],
      text: message,
      parse_mode: "Markdown",
    };

    this._telegramNotificationService.sendMessage(payload);
  }
}

export default TelegramService;
