## Lazy Model Evaluation
By using a function to lazily evaluate the models, you can easily handle circular references or models that are declared later in the code.

### Example
- Separate Model Files: `AddressModel.ts` and `PersonModel.ts` are separate files containing the definitions for the AddressModel and PersonModel, respectively.
- Lazy Evaluation: Both AddressModel and PersonModel use a function for the type field to lazily import each other, thus handling circular references.
- Main Logic: The main.ts file imports both models and demonstrates how to create instances that are linked to each other, fulfilling the circular reference.

File: `AddressModel.ts`
```ts
import { createGraphDBModel } from "graphdb-utils";

// Initialize the AddressModel
export const AddressModel = createGraphDBModel({
  city: { type: String, internalKey: "ic:hasCity" },
  // Lazy reference to PersonModel to handle circular reference
  resident: { type: () => require("./PersonModel").PersonModel, internalKey: "ic:hasResident" }
}, {
  rdfTypes: [":Address"],
  name: "address"
});
```

File: `PersonModel.ts`
```ts
import { createGraphDBModel } from "graphdb-utils";

// Initialize the PersonModel with a lazy reference to AddressModel
export const PersonModel = createGraphDBModel({
  name: { type: String, internalKey: "cids:hasName" },
  address: { type: () => require("./AddressModel").AddressModel, internalKey: "cids:hasAddress" }
}, {
  rdfTypes: [":Person"],
  name: "person"
});
```

File: `main.ts`
```ts
// Import models
import { PersonModel } from "./PersonModel";

// Create a new person instance
const person = PersonModel({
  name: "John Doe",
  address: {city: "Toronto"}
});

// Link the address to the person (circular reference)
address.resident = person;

// Now both `person` and `address` are linked to each other
console.log("Person's address:", person.address.city);  // Output: "Toronto"
console.log("Address's resident:", person.address.resident.name);  // Output: "John Doe"

await person.save();
```
