# Usages and Examples

## Install
### Install GraphDB Utils
```shell
npm install git+https://github.com/csse-uoft/graphdb-utils.git
```

### Install a specific version (v1.0.0)
```shell
npm install git+https://github.com/csse-uoft/graphdb-utils.git#v1.0.0
```

### Start a GraphDB and a MongoDB Instance
The web interface is available at http://127.0.0.1:7200
```shell
docker run -p 7200:7200 -d --name graphdb --restart unless-stopped -t ontotext/graphdb:10.0.2 --GDB_HEAP_SIZE=6G -Dgraphdb.workbench.maxUploadSize=2097152000
docker run --name mongo -p 27017:27017 --restart unless-stopped -d mongo:latest
```

## Initialize GraphDB Utils
```js
const {GraphDB, initGraphDB, MongoDBIdGenerator, UUIDGenerator, Types} = require("graphdb-utils");

// ID Generator for creating new instances
const idGenerator = new MongoDBIdGenerator("mongodb://127.0.0.1:27017/gdb-utils");
// Or using UUID instead of counter
// const idGenerator = new UUIDGenerator();

// This determines the prefixes.
// For example, `ic:Address` is same as `http://ontology.eil.utoronto.ca/tove/icontact#Address`
const namespaces = {
  "": "http://gdb-utils#",
  'cids': 'http://ontology.eil.utoronto.ca/cids/cids#',
  'foaf': 'http://xmlns.com/foaf/0.1/',
  'cwrc': 'http://sparql.cwrc.ca/ontologies/cwrc#',
  'ic': 'http://ontology.eil.utoronto.ca/tove/icontact#',
};

const result = await initGraphDB({
  idGenerator,
  // GraphDB Server Address
  address: "http://127.0.0.1:7200",
  // Remove the username and password fields if the GraphDB server does not require authentication 
  username: "username",
  password: "password",
  namespaces,
  // The repository name, a new repository will be created if does not exist.
  repositoryName: 'gdb-utils',
});
```

## Setting up models that matches with the knowledge graph

> See the full model examples: [Address](https://github.com/csse-uoft/Pathfinder/blob/main/backend/models/address.js),
> [Person](https://github.com/csse-uoft/Pathfinder/blob/main/backend/models/person.js)
> 
> See the [list of supported data types](datatypes.md)

Assuming we have an Ontology Class `cids:Person` that takes the following properties:

| Property URI    | Data Property? | Object Property? | Type                |
|-----------------|----------------|------------------|---------------------|
| foaf:familyName | ✔️              |                  | max 1 xsd:string    |
| foaf:givenName  | ✔️              |                  | max 1 xsd:string    |
| ic:hasAddress   |                | ✔️                | multiple ic:Address |

Where `ic:Address` has the following properties:

| Property URI | Data Property? | Object Property? | Type               |
|--------------|----------------|------------------|--------------------|
| ic:hasCityS  | ✔️              |                  | max 1 xsd:string   |
| ...          |                |                  |                    |

```js
// Create an Address model.
const AddressModel = createGraphDBModel({
    city: {type: String, internalKey: 'ic:hasCityS'}, // `interalKey` matches the property URI;
    }, {
    // `rdfTypes` is a list of the Ontology Classes the this model matches to.
    // `name` should be unique and will be used to generate URIs when creating new instances if uri is not specified.
    rdfTypes: ['ic:Address'], name: 'address'
});

const PersonModel = createGraphDBModel({
    familyName: {type: String, internalKey: 'foaf:familyName'},
    givenName: {type: String, internalKey: 'foaf:givenName'},
    // When referecing models from other files or declared later, 
    // the `type` could be a function that returns the model that will be evaluated later:
    // Example: {type: () => require("./some-js-file").SomeModel, internalKey: ...}
    address: {type: AddressModel, internalKey: 'ic:hasAddress'},
}, {
    rdfTypes: ['cids:Person'], name: 'person'
});
```

## Create Instances and Save
Creating an instance is straightforward by giving the data to the `PersonModel`.
```js
const person = PersonModel({
  familyName: 'Robert',
  givenName: 'James',
  address: {
    city: 'Ontario'
  }
});
// Save it!
await person.save();

// You can later modify it and resave it
person.givenName = 'Lester';
await person.save();
```
Specifying the URI of the new instance:
```js
const person = PersonModel({
  familyName: 'Robert',
  givenName: 'James',
  address: {
    city: 'Ontario'
  }
}, {uri: 'http://test/person/1'});
await person.save();
```

### Query and Delete
> See[ full API documentation](https://csse-uoft.github.io/graphdb-utils/classes/GraphDBModel.html#find)

By default, `Model.find(...)` only returns the first level of properties, in this case the properties within`person.address` is not retrieved by default.

```js
// Returns all persons, address will not be available
const persons = await PersonModel.find({});

// Find a person with a specific URI
const person = await PersonModel.findByUri("http://test/person/1");

// Returns all persons and populates the address
const persons = await PersonModel.find({}, {populates: ['adress']})

// Return all persons that has the address in "Ontario"
const persons = await PersonModel.find({address: {city: 'Ontario'}}, {populates: ['address']})

// Get the URI of the first person in the result
console.log(persons[0]._uri);

// Get the familyName
console.log(persons[0].familyName);

// Update the familyName
persons[0].familyName = 'Tom';
await persons[0].save();

// Find one instance and delete, this deletes all person instances that have the name 'Tom'
await Person.findAndDelete({familyName: 'Tom'})
```

