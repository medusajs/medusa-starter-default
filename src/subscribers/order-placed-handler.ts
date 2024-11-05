import {
  SubscriberConfig,
  SubscriberArgs,
} from "@medusajs/framework";
import {IOrderModuleService} from '@medusajs/framework/types';
import { Modules } from "@medusajs/framework/utils"

export default async function orderPlacedHandler({
  event,
  container,
  pluginOptions,
}: SubscriberArgs<Record<string, any>>) {
  
}

export const config: SubscriberConfig = {
  event: 'order.placed',
  context: {
    subscriberId: "order-placed-handler",
  },
};
