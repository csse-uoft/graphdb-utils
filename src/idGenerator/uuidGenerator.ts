import {IDGenerator} from "./base";
import crypto from 'crypto'

export class UUIDGenerator implements IDGenerator {
    regex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;
    async getNextId(counterName: string): Promise<string> {
        return crypto.randomUUID();
    }
}
