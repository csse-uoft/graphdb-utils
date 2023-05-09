### ID Generator for Named Individuals

GraphDB Utils uses an external service for generating incremental numeric IDs for Named Individuals. You have two options to choose from:

- MongoDB
- Redis

Please note that once you have chosen one of these services, you should not switch between them if there is already data stored. This is to ensure the integrity and consistency of your data.

#### Custom ID Generator Implementation
To create your own ID generator, you can implement the provided abstract class `IDGenerator` as shown below. This will allow you to use any external service of your choice for generating incremental numeric IDs for your Named Individuals.
```ts
abstract class IDGenerator {
    abstract getNextCounter(counterName: string): Promise<number>;
}
```