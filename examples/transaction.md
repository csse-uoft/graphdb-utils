## Transaction Support

```ts
import { createGraphDBModel, Transaction } from "graphdb-utils";
import { expect } from "chai";

// Initialize the PersonModel
const PersonModel = createGraphDBModel({
  name: { type: String, internalKey: "cids:hasName" },
}, {
  rdfTypes: [":PersonTest"],
  name: "personTest"
});

// Function to demonstrate transaction support
const demonstrateTransaction = async () => {
  // Start a new transaction
  await Transaction.beginTransaction();

  try {
    // Create a new person and save it
    const person = PersonModel({
      name: "John Doe"
    });
    await person.save();

    // Find all persons and expect one result
    const personsBeforeCommit = await PersonModel.find({});
    expect(personsBeforeCommit).to.have.length(1);

    // Find all persons out of the transaction and expect zero result
    const personsBeforeCommit = await PersonModel.find({}, {ignoreTransaction: true});
    expect(personsBeforeCommit).to.have.length(1);

    // Commit the transaction
    await Transaction.commit();

    // Find all persons again and expect one result
    const personsAfterCommit = await PersonModel.find({});
    expect(personsAfterCommit).to.have.length(1);

  } catch (error) {
    // If an error occurs, rollback the transaction
    await Transaction.rollback();
    console.error("Transaction failed:", error);
  }
};

// Execute the function to demonstrate transaction support
demonstrateTransaction().catch(err => console.error(err));
```
