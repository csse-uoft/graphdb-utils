export abstract class IDGenerator {
    abstract getNextCounter(counterName: string): Promise<number>;
}
