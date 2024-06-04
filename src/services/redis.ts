import {
    MedusaContainer,
    OrderService,
    SalesChannelService,
    TransactionBaseService,
} from "@medusajs/medusa";
import { IEventBusService } from "@medusajs/types";
import { createClient, RedisClientType } from 'redis';
import axios, { AxiosRequestConfig } from 'axios';

const REDIS_URL = process.env.REDIS_URL;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

export default class RedisService extends TransactionBaseService {
    private readonly _client: RedisClientType;

    constructor(
        {

        },
        options: Record<string, unknown>
    ) {
        // @ts-ignore
        super(...arguments);
        this._client = createClient({
            url: REDIS_URL,
            password: REDIS_PASSWORD
        });
    }

    public async connectAsync(): Promise<RedisClientType> {
        return await this._client?.connect();
    }

    public async subscribeToRequestsAsync(): Promise<void> {
        await this._client.subscribe("axios:request", async (message, channel) => {
            try {
                const config = JSON.parse(message) as AxiosRequestConfig;
                await axios(config);
            }
            catch (error: any) {
                console.error(error);
            }
        });
    }
}
