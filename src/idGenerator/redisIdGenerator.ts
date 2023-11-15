import {createClient} from "redis";
import {IDGenerator} from "./base";

export class RedisIdGenerator implements IDGenerator {
    private client: any;
    regex = /[0-9]+/;

    constructor(connectionString: string, options: any = {}) {
        // @ts-ignore
        this.client = createClient({url: connectionString, ...options});
        this.client.connect();
    }

    async getNextId(counterName: string): Promise<number> {
        if (!this.client.connected) {
            await this.client.connect();
        }
        return await this.client.incrBy(counterName, 1);
    }
}
