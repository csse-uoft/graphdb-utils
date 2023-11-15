export abstract class IDGenerator {
    /**
     * The regex of the ID.
     * This is used to extract the ID from instance URI and populate into the instance as `instance._id`.
     */
    abstract regex: RegExp;

    /**
     * Get the next ID for some specific `counterName`.
     * The ID generated each time should be unique within the same `countName`.
     */
    abstract getNextId(counterName: string): Promise<number|string>;
}
