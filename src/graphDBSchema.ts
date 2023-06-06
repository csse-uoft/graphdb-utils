import {GraphDBDocument} from './graphDBDocument';
import {GraphDBModel} from './graphDBModel';
import {Types, defaultOptions, DeleteType, regexBuilder, SPARQL, isModel, getModel} from './helpers';

const store: { [key: string]: GraphDBModel } = {};

export type GDBBaseValueType = (string | number | Date | boolean | object | GraphDBDocument | null | undefined)
  | (string | number | Date | boolean | object | GraphDBDocument)[];

export type GraphDBModelConstructor =
  GraphDBModel
  & ((data: object, options?: object) => GraphDBDocument & { [key: string]: GDBBaseValueType });
export type GDBType = StringConstructor | NumberConstructor | DateConstructor | BooleanConstructor
  | string | 'owl:NamedIndividual' | 'GraphDB.Self!' | GraphDBModelConstructor | (() => GraphDBModelConstructor);


export interface SchemaOptions {
  // The prefix of the created documents' identifier.
  // e.g. if `name="primary_contact"`, the new created document will have id `:primary_contact_1`
  name: string;

  // The list of value in rdf:type.
  // owl:NamedIndividual will be added if not given
  // e.g. `[Types.NamedIndividual, ":primary_contact"]` => `some_instance rdf:type owl:NamedIndividual, :primary_contact.`
  rdfTypes: string[];
}

export interface GraphDBPropertyOptions {
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

export interface GraphDBSchema {
  [key: string]: GDBType | GraphDBPropertyOptions;
}

export function createGraphDBModel(schema: GraphDBSchema, schemaOptions: SchemaOptions): GraphDBModelConstructor {
  if (!schema) throw new Error('schema must be provided');

  // if type.schemaOptions.name does not contain prefix, default to empty prefix `:`
  if (!schemaOptions.name.includes(':')) {
    schemaOptions.name = `:${schemaOptions.name}`
  }

  const preload = (iteratedCache = new Set()) => {
    // Check if we already checked this document.
    if (iteratedCache.has(schemaOptions.name)) {
      return;
    }
    iteratedCache.add(schemaOptions.name);

    const externalKey2Option = new Map();
    const internalKey2Option = new Map();

    // nested model information
    const nestedType2Model = new Map();

    for (let [key, options] of Object.entries(schema)) {
      // Map to our data structure with some predefined options
      if (typeof options !== "object" || Array.isArray(options)) {
        options = {...defaultOptions, type: options};
      } else {
        options = {...defaultOptions, ...options};
      }

      const internalKey = options.internalKey || `:${options.prefix}${key}`;
      const externalKey = options.externalKey || (Array.isArray(options.type) ? `${key}` : key);

      options = {...options, internalKey, externalKey, schemaKey: key};

      externalKey2Option.set(externalKey, options);
      internalKey2Option.set(internalKey, options);

      // Nested model, i.e. `[GDBPerson]` or `GDBPerson`
      if (isModel(options.type) || Array.isArray(options.type) && isModel(options.type[0])) {

        let nestedModel: GraphDBModel;
        if (Array.isArray(options.type)) {
          nestedModel = getModel(options.type[0]) as GraphDBModel;
        } else {
          nestedModel = getModel(options.type) as GraphDBModel;
        }
        nestedModel._preload(iteratedCache);
        for (const nestedRdfType of nestedModel.schemaOptions.rdfTypes) {
          if (nestedRdfType === Types.NamedIndividual || nestedRdfType === SPARQL.getFullURI(Types.NamedIndividual)) continue;
          if (nestedRdfType.includes("://"))
            nestedType2Model.set(nestedRdfType, nestedModel);
          else
            nestedType2Model.set(SPARQL.getFullURI(nestedRdfType), nestedModel);
        }
        for (const [innerKey, innerVal] of nestedModel.nestedType2Model?.entries() || []) {
          nestedType2Model.set(innerKey, innerVal);
        }

      }
    }

    // The instance of an owl:Class must be an owl:NamedIndividual
    if (!schemaOptions.rdfTypes.includes(Types.NamedIndividual)) {
      schemaOptions.rdfTypes.unshift(Types.NamedIndividual);
    }
    return {externalKey2Option, internalKey2Option, nestedType2Model, schemaOptions}
  }
  const model = GraphDBModel.init({schemaOptions, schema, preload});
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
