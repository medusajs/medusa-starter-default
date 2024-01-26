import {
  SubscriberConfig,
  SubscriberArgs,
} from "@medusajs/medusa/dist/types/subscribers";
import { OrderService } from "@medusajs/medusa";
import TelegramService from "../services/telegram";

export default async function orderPlacedHandler({
  data,
  eventName,
  container,
  pluginOptions,
}: SubscriberArgs<Record<string, any>>) {
  const telegramService: TelegramService = container.resolve("telegramService");
  await telegramService.sendMessageOnOrderPlacedAsync(data.id);
}

export const config: SubscriberConfig = {
  event: OrderService.Events.PLACED,
  context: {
    subscriberId: "order-placed-handler",
  },
};
