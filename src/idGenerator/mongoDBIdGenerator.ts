import mongoose, {Connection} from 'mongoose';
import {IDGenerator} from "./base";

export class MongoDBIdGenerator implements IDGenerator {
    private conn: Connection;
    private model: any;

    constructor(connectionString: string, options: any = {}) {
        // @ts-ignore
        this.conn = mongoose.createConnection(connectionString, {useNewUrlParser: true, useUnifiedTopology: true, ...options});

        const GraphDBCounterSchema = new mongoose.Schema({
            _id: {type: String, required: true},
            seq: {type: Number, default: 0}
        });
        this.model = this.conn.model('GraphDBCounter', GraphDBCounterSchema);
    }

    async getNextCounter(counterName: string): Promise<number> {
        const counter = await this.model.findOneAndUpdate({_id: counterName},
            {$inc: {seq: 1}}, {new: true, upsert: true});
        return counter.seq;
    }
}
