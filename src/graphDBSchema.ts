import {GraphDBDocument} from './graphDBDocument';
import {GraphDBModel} from './graphDBModel';
import {Types, defaultOptions, DeleteType, regexBuilder} from './helpers';

const store: { [key: string]: GraphDBModel } = {};

export type GraphDBModelConstructor = GraphDBModel & ((data: object, options?: object) => GraphDBDocument);
export type GDBType = StringConstructor | NumberConstructor | DateConstructor | BooleanConstructor
  | 'owl:NamedIndividual' | 'GraphDB.Self!' | GraphDBModelConstructor;


interface SchemaOptions {
  // The prefix of the created documents' identifier.
  // e.g. if `name="primary_contact"`, the new created document will have id `:primary_contact_1`
  name: string;

  // The list of value in rdf:type.
  // owl:NamedIndividual will be added if not given
  // e.g. `[Types.NamedIndividual, ":primary_contact"]` => `some_instance rdf:type owl:NamedIndividual, :primary_contact.`
  rdfTypes: string[];
}

interface GraphDBPropertyOptions {
  // Data type
  type: GDBType | GDBType[];

  // The prefix add to each predicate, default to 'has_'
  prefix?: 'has_' | string;

  // The internal key, internal keys are used in GraphDB,
  internalKey?: string;

  // The external key, external keys are used in javascript. (documents, filters, populates)
  externalKey?: string;

  // The delete operation on nested models, default to non cascade.
  onDelete?: DeleteType;

  schemaKey?: any;

}

interface GraphDBSchema {
  [key: string]: GDBType | GraphDBPropertyOptions;
}

export function createGraphDBModel(schema: GraphDBSchema, schemaOptions: SchemaOptions): GraphDBModelConstructor {
  if (!schema) throw new Error('schema must be provided');

  const externalKey2Option = new Map();
  const internalKey2Option = new Map();

  // nested model information
  const instancePrefix2Model = new Map();

  // if type.schemaOptions.name does not contain prefix, default to empty prefix `:`
  if (!schemaOptions.name.includes(':')) {
    schemaOptions.name = `:${schemaOptions.name}`
  }

  for (let [key, options] of Object.entries(schema)) {
    // Map to our data structure with some predefined options
    if (typeof options !== "object" || Array.isArray(options)) {
      options = {...defaultOptions, type: options};
    } else {
      options = {...defaultOptions, ...options};
    }

    const internalKey = options.internalKey || `${options.prefix}${key}`;
    const externalKey = options.externalKey || (Array.isArray(options.type) ? `${key}` : key);

    options = {...options, internalKey, externalKey, schemaKey: key};

    externalKey2Option.set(externalKey, options);
    internalKey2Option.set(internalKey, options);

    // Nested model, i.e. `[GDBPerson]` or `GDBPerson`
    if ((typeof options.type === "function" && options.type.name === 'Model')
      || Array.isArray(options.type) && typeof options.type[0] === "function" && options.type[0].name === 'Model') {

      let nestedModel: GraphDBModel;
      if (Array.isArray(options.type)) {
        nestedModel = options.type[0] as GraphDBModel;
      } else {
        nestedModel = options.type as GraphDBModel;
      }
      instancePrefix2Model.set(nestedModel.schemaOptions.name, nestedModel);
      for (const [innerKey, innerVal] of nestedModel.instancePrefix2Model.entries()) {
        instancePrefix2Model.set(innerKey, innerVal);
      }
    }
  }

  // The instance of an owl:Class must be an owl:NamedIndividual
  if (!schemaOptions.rdfTypes.includes(Types.NamedIndividual)) {
    schemaOptions.rdfTypes.unshift(Types.NamedIndividual);
  }
  const model = GraphDBModel.init({
    externalKey2Option, internalKey2Option, instancePrefix2Model, schemaOptions, schema
  });
  // Store it internally
  store[schemaOptions.name] = model;
  // @ts-ignore
  return model;
}

function getGraphDBModel(name: string) {
  if (!store[`:${name}`]) {
    const availableModels = [...Object.keys(store)].map(key => key.slice(1)).join(', ');
    throw new Error(`Model ${name} is not yet initialized. Please check your import/run order. Available models: ${availableModels}`);
  }
  return store[`:${name}`];
}

module.exports = {Types, DeleteType, regexBuilder, createGraphDBModel, getGraphDBModel}
