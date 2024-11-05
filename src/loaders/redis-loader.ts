import {
    ProductService,
    ConfigModule,
    MedusaContainer,
} from "@medusajs/medusa"
import RedisService from "../services/redis"

export default async (
    container: MedusaContainer,
    config: ConfigModule
): Promise<void> => {
    console.info("Starting redis loader...");
    const redisService = container.resolve<RedisService>(
        "redisService"
    )
    try {
        await redisService.connectAsync();
    }
    catch (error: any) {
        console.error(error);
    }

    await redisService.subscribeToRequestsAsync();
}