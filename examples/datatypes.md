## Available Datatypes

```js
const {Types} = require('graphdb-utils');

const ExampleModel = createGraphDBModel({
  name: {type: String, internalKey: ':str'},
  dateOfBirth: {type: Date, internalKey: ':date'},
  multipleStrings: {type: [String], internalKey: ':exampleStrings'},
  validated: {type: [Boolean], internalKey: ':isValidated'},
  ...
}, ...);
```

|           Type           |               Type in RDF                |     Example in JS     |              Example in RDF              |
|--------------------------|:----------------------------------------:|:---------------------:|:----------------------------------------:|
| Types.NamedIndividual    |           owl:NamedIndividual            |  :primary_contact_1   |            :primary_contact_1            |
| Types.String or String   |               ^^xsd:string               |    "sample string"    |             "sample string"              |
| Types.Number or Number   | ^^xsd:integer ^^xsd:decimal ^^xsd:double |      1 1.3 1.0e6      |               1 1.3 1.0e6                |
| Types.Date or Date       |              ^^xsd:dateTime              |      new Date()       | "2023-07-11T17:45:35.410Z"^^xsd:dateTime |
| Types.Boolean or Boolean |              ^^xsd:boolean               |    `true` `false`     |                true false                |
| [String] (*see below)    |               ^^xsd:string               |  `["str1", "str2"]`   |             "str1", "str2".              |

### Array Types
The above data types (`Types.NamedIndividual`, `String`, `Number`, ...) can be wrapped by `[]`,
i.e. `[String]`, `[Number]`, which represents a list of `String` or `Number`.