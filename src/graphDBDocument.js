const {GraphDB, getGraphDBAttribute} = require('./graphDB');
const {deepAssign, isModel, isGraphDBDocument, getIdFromIdentifier, Types, valToGraphDBValue, pathsToObj, SPARQL} = require('./helpers');
const {idGenerator} = require('./loader/index');
const {getIdGenerator} = require("./loader");


/**
 * @class GraphDBDocument
 */
class GraphDBDocument {
  /**
   *
   * @param {{}} data
   * @param {GraphDBModel} model
   * @param {boolean} isNew
   * @param {string} [uri]
   */
  constructor({data, model, isNew = false, uri}) {
    this.model = model;
    this.initialData = {...data};
    this._internal = {
      uri: uri
    };
    // shallow copy arrays/objects
    for (const [key, value] of Object.entries(this.initialData)) {
      if (Array.isArray(value))
        this.initialData[key] = [...value];
      else if (typeof value === "object")
        this.initialData[key] = {...value};
    }
    this.isNew = isNew;
    this.modified = [];
    this._id = undefined;

    /**
     * the document's model schema.
     * @type {{}}
     */
    this.schema = this.model.schema;

    /**
     * Get the document's model schemaOptions.
     * @type {SchemaOptions}
     */
    this.schemaOptions = this.model.schemaOptions;

    Object.assign(this, data);

    if (isNew) {
      delete this._id;
      delete this.initialData._id;
    }
  }

  get individualName() {
    if (!this._id) {
      console.warn(`GraphDBDocument.individualName is deprecated. Returning "undefined" for "${this._uri} as there is no _id for it.`);
      return;
    }
    return `${this.schemaOptions.name}_${this._id}`;
  }

  /**
   * Get the URI of the document.
   * @returns {string}
   */
  get _uri() {
    if (this._id) {
      const baseUri = SPARQL.getFullURI(this.schemaOptions.name);
      return `${baseUri}_${this._id}`;
    } else if (this._internal.uri) {
      return this._internal.uri;
    } else {
      return undefined;
      // throw new Error("Should not reach here: Both doc._id and doc._internal.uri are unset.");
    }
  }

  /**
   * Get the document data.
   * @return {{}}
   */
  get data() {
    const data = {...this};
    // Remove unwanted instance properties
    ['model', 'initialData', 'isNew', 'modified', 'schema', 'schemaOptions', '_internal'].forEach(name => delete data[name]);
    return data;
  }

  /**
   * Is this document modified and did not push the changes.
   * Also update `this.modified` array.
   * @return {boolean}
   */
  get isModified() {
    if (this.isNew)
      this.modified = Object.keys(this.data);

    // TODO: Bug fix when using delete keywords on a property,
    //  i.e. delete characteristic.implementation.options;
    for (let [key, value] of Object.entries(this.data)) {
      const initialValue = this.initialData[key];

      // Mark modified if initially null and now not null/not empty
      if (initialValue == null && (Array.isArray(value) ? value.length !== 0 : value != null)) {
        this.modified.push(key);
      }

      // Initially populated
      else if (initialValue instanceof GraphDBDocument) {
        // Assigned with js object
        if (!(value instanceof GraphDBDocument)) {
          Object.assign(initialValue, value);
          this[key] = initialValue;
          this.modified.push(key);
        }
        // Assigned inside the inner document
        else if (value === initialValue) {
          if (value.isModified) {
            this.modified.push(key);
          }
        }
        // Assigned with a new doc
        else if (value instanceof GraphDBDocument) {
          this.modified.push(key);
        }
        // Assigned with a string
        else if (typeof value === "string") {
          this.modified.push(key);
        }
        // Other cases?
        else {
          throw Error('Document.prototype.isModified: Unknown case')
        }
      }

      // Array case
      else if (Array.isArray(value)) {
        // Skip if length is 0 (Not modified)
        if (initialValue == null && value.length === 0)
          continue;
        if (value.length === 0) {
          this.modified.push(key);
        } else if (value.length !== initialValue.length) {
          this.modified.push(key);
        } else {
          for (let i = 0; i < value.length; i++) {
            if (initialValue[i] instanceof GraphDBDocument) {
              // Assigned with js object
              if (!(value[i] instanceof GraphDBDocument)) {
                Object.assign(initialValue[i], value[i]);
                this[key][i] = initialValue[i];
                this.modified.push(key);
              }
              // Assigned inside the inner document
              else if (value[i] === initialValue[i]) {
                if (value[i].isModified) {
                  this.modified.push(key);
                  break;
                }
              }
            } else if (value[i] !== initialValue[i]) {
              this.modified.push(key);
              break;
            }
          }
        }
      }
      // Simply value not equal
      else if (initialValue !== value) {
        this.modified.push(key);
      }
    }

    this.modified = [...new Set(this.modified)];
    return this.modified.length > 0;
  }

  /**
   * @ignore
   * @return {Map}
   */
  get externalKey2Option() {
    return this.model.externalKey2Option;
  }

  /**
   * @ignore
   * @return {Map}
   */
  get internalKey2Option() {
    return this.model.internalKey2Option;
  }

  /**
   * Get a property of the document using path.
   * @example `doc.get('organization.primary_contact')`
   * @param {string} path
   * @return {undefined|GraphDBDocument|string|number|boolean}
   */
  get(path) {
    const paths = path.split('.');
    let result = this[paths[0]];
    for (let i = 1; i < paths.length; i++) {
      const curr = paths[i];
      if (result == null || typeof result !== "object" || result[curr] == null)
        return undefined;
      result = result[curr];
    }
    return result;
  }

  /**
   * Set a property of the document using path.
   * @example `doc.get('organization.primary_contact')`
   * @param {string} path
   * @param {*} obj
   * @param {boolean} [isPopulate] - Is calling from populate
   * @return {undefined|GraphDBDocument|string|number|boolean}
   */
  set(path, obj, isPopulate) {
    const paths = path.split('.');
    let curr = this;
    for (let i = 0; i < paths.length - 1; i++) {
      if (curr == null || typeof curr !== "object" || !curr[paths[i]])
        throw new Error(`GraphDBDocument.set: Path ${path} not valid`)
      curr = curr[paths[i]];
    }
    curr[paths[paths.length - 1]] = obj;
    if (isPopulate) {
      // shallow copy
      if (Array.isArray(obj))
        this.initialData[paths[paths.length - 1]] = [...obj];
      else if (typeof obj === "object" && !(obj instanceof GraphDBDocument))
        this.initialData[paths[paths.length - 1]] = {...obj};
      else
        this.initialData[paths[paths.length - 1]] = obj;
    }

  }

  cleanData(data) {
    return this.model.cleanData(data);
  }

  async generateId() {
    if (this._id == null)
      this._id = await (await getIdGenerator()).getNextCounter(this.model.schemaOptions.name);
    return this._id;
  }

  async generateURI() {
    // Both _id and uri is not provided, create a new URI with IDGenerator.
    if (this._internal.uri) {
      return this._internal.uri;
    } else if (this._id == null && this._internal.uri == null) {
      const baseUri = SPARQL.getFullURI(this.schemaOptions.name);
      this._id = await (await getIdGenerator()).getNextCounter(this.model.schemaOptions.name);
      this._internal.uri = `${baseUri}_${this._id}`;
    } else if (this._internal.uri == null) {
      throw new Error("uri is not provided.")
    }
    return this._internal.uri;
  }

  async getQueries() {
    const uri = await this.generateURI();
    const data = this.cleanData(this.data);
    const {header, footer, queryBody, innerQueryBodies, instanceName} = await this.model.generateCreationQuery(uri, data);
    const joinedQueryBody = innerQueryBodies.join('') + queryBody;
    const joinedQuery = header + joinedQueryBody + footer;
    return {queryBody: joinedQueryBody, instanceName, query: joinedQuery};
  }

  /**
   * @param {string[]|string} key - The external key to mark modified.
   */
  markModified(key) {
    if (Array.isArray(key))
      this.modified.push(...key);
    else
      this.modified.push(key);
  }

  getPopulateQuery(fieldKey, topIndex = 0) {
    if (!this.externalKey2Option.has(fieldKey))
      throw new Error(`GraphDBDocument.getPopulateQuery: Unknown key ${fieldKey}`)

    let currModel = this.externalKey2Option.get(fieldKey).type;
    const isArrayType = Array.isArray(currModel);
    const whereClause = [];

    // TODO: when this.data.xxx is not provided, i.e. not projected.
    // The populated field is an array
    if (isArrayType && isModel(currModel[0])) {
      currModel = currModel[0];

      if (this[fieldKey])
        // Iterate the identifiers/subjects of the instance
        for (const [idx, subject] of this[fieldKey].entries()) {
          if (typeof subject === "object")
            throw new Error('Should not be a object.')
          if (subject.includes("://")) {
            whereClause.push(`?s = <${subject}>`);
          } else {
            whereClause.push(`?s = ${subject}`);
          }
        }
    }
    // The populated field is a single Model.
    else if (isModel(currModel)) {
      if (this[fieldKey]) {
        if (this[fieldKey].includes("://")) {
          whereClause.push(`?s = <${this[fieldKey]}>`);
        } else {
          whereClause.push(`?s = ${this[fieldKey]}`);
        }
      }
    } else {
      throw new Error(`GraphDBDocument.getPopulatedFieldValue: Cannot populate ${fieldKey} into ${this.schemaOptions.name}; Schema is not provided.`);
    }
    const query = `${SPARQL.getSPARQLPrefixes()}\nCONSTRUCT {?s ?p ?o} WHERE {\n\t?s ?p ?o\nFILTER (\n\t${whereClause.join(' ||\n\t')}\n\t)\n}`;

    return {currModel, isArrayType, whereClause, query};
  }

  /**
   * Populate a field by path, and return this GraphDBDocument.
   * @param {string} path - Path to the field that will be populated, i.e. `account.primary_contact`
   * @return {Promise<GraphDBDocument>}
   */
  async populate(path) {
    if (this.isNew) throw new Error('GraphDBDocument.populate: Populate only works on existing GraphDBDocument.');

    if (!path) throw new Error('GraphDBDocument.populate: Path must be given.');

    path = path.trim();
    return await this.populateMultiple([path]);
  }

  // Performance optimized
  // Breadth first populate for combining queries
  async populateMultiple(paths) {
    if (this.isNew) throw new Error('GraphDBDocument.populateMultiple: Populate only works on existing GraphDBDocument.');

    if (!paths || !Array.isArray(paths) || paths.length === 0) throw new Error(`GraphDBDocument.populateMultiple: Paths ${paths} is not valid.`);

    const {GraphDBDocumentArray} = require('./graphDBDocumentArray');
    const arr = new GraphDBDocumentArray();
    arr.push(this);
    await arr.populateMultiple(paths);
    return arr[0];
  }

  async save() {
    if (this.isNew) {
      const {query} = await this.getQueries();
      // console.log(query)
      await GraphDB.sendUpdateQuery(query);
      this.isNew = false;
    } else {
      const uri = `<${this._uri}>`;

      if (!this.isModified)
        return;

      // Remove unwanted fields
      const data = this.cleanData(this.data);

      const deleteClause = [], insertClause = [];

      for (const [index, key] of this.modified.entries()) {
        const option = this.externalKey2Option.get(key);
        let value = data[key];

        // Skip undefined value
        if (value == null) {
          // TODO: Delete nested object(s) when DELETE_TYPE set to cascade.
          // Removed the value that is marked null or undefined
          if (option)
            deleteClause.push(`${uri} ${SPARQL.getPredicate(option.internalKey)} ?o${index}.`);
          continue;
        }

        async function processNestedDocument(predicate, option, object) {
          const nestedDeleteClause = [], nestedInsertClause = [];
          const nestedModel = Array.isArray(option.type) ? option.type[0] : option.type;

          // Provides an individual name
          if (typeof object === "string") {
            nestedDeleteClause.push(`${uri} ${SPARQL.getPredicate(option.internalKey)} ?o${index}.`);

            if (object.includes('://'))
              object = `<${object}>`
            else if (!object.includes(':'))
              throw new Error('Improper instance syntax.');

            nestedInsertClause.push(`${uri} ${SPARQL.getPredicate(option.internalKey)} ${object}.`);
            return;
          }

          // Create a new document if provides a data object
          if (!(object instanceof GraphDBDocument)) {
            // This object could contain an _id or _uri property, thus we cannot set isNew to true,
            // Instead, we mark all properties as modified to avoid creating duplicated object with different _id.
            const modifiedKeys = Object.keys(object);
            object = new GraphDBDocument({
              model: nestedModel,
              data: object,
              uri: object._uri
            });
            object.markModified(modifiedKeys);
          }

          // Get initial _uri for the nested GraphDBDocument.
          if (object._uri == null) {

            // Create a new id for the nested instance if the predicate is not set initially
            if (!this.initialData[predicate]) {
              object.isNew = true;
              object._id = await (await getIdGenerator()).getNextCounter(nestedModel.schemaOptions.name);
              nestedInsertClause.push(`${uri} ${SPARQL.getPredicate(option.internalKey)} ${nestedModel.schemaOptions.name}_${object._id}.`);
            } else {
              // We have the predicate set to something: a URI or {_uri, ...}
              object._internal.uri = typeof this.initialData[predicate] === "object" ?
                this.initialData[predicate]._uri : this.initialData[predicate];
            }
          }

          // Store already created nested document id
          if (!object.isNew) {
            nestedDeleteClause.push(`${uri} ${SPARQL.getPredicate(option.internalKey)} ?o${index}.`);
            nestedInsertClause.push(`${uri} ${SPARQL.getPredicate(option.internalKey)} <${object._uri}>.`);
          }
          // TODO: Avoid unnecessary updates by introducing new state isChanged
          await object.save();
          return {object, nestedInsertClause, nestedDeleteClause};
        }

        // Single nested model
        if (isModel(option.type)) {
          const {object, nestedInsertClause, nestedDeleteClause} = await processNestedDocument(key, option, value);
          data[key] = object;
          insertClause.push(...nestedInsertClause);
          deleteClause.push(...nestedDeleteClause);
        }
        // Array of models, most bugs come from here
        else if (Array.isArray(option.type) && isModel(option.type[0])) {
          deleteClause.push(`${uri} ${SPARQL.getPredicate(option.internalKey)} ?o${index}.`);
          // Iterate all GraphDBDocument
          for (let [j, doc] of value.entries()) {
            const {object, nestedInsertClause} = await processNestedDocument(key, option, doc);
            value[j] = object;
            insertClause.push(...nestedInsertClause);
          }
        } else if (Object.values(Types).includes(option.type)) {
          deleteClause.push(`${uri} ${SPARQL.getPredicate(option.internalKey)} ?o${index}.`);
          insertClause.push(`${uri} ${SPARQL.getPredicate(option.internalKey)} ${valToGraphDBValue(value, option.type)}.`);
        } else if (Array.isArray(option.type)) {

          const innerType = option.type[0];
          deleteClause.push(`${uri} ${SPARQL.getPredicate(option.internalKey)} ?o${index}.`);

          for (const nestedValue of value) {
            if (Object.values(Types).includes(innerType)) {
              insertClause.push(`${uri} ${SPARQL.getPredicate(option.internalKey)} ${valToGraphDBValue(nestedValue, innerType)}.`);
            }
          }
        }

      }

      if (insertClause.length === 0 && deleteClause.length === 0)
        return;

      let deleteStatement = ''
      for (const deleteTriple of deleteClause) {
        deleteStatement += `DELETE where {\n\t${deleteTriple}\n};\n`;
      }

      const query = `${SPARQL.getSPARQLPrefixes()}\n${deleteStatement}INSERT DATA {\n\t${insertClause.join('\n\t')}\n}`
      // console.log(query)
      await GraphDB.sendUpdateQuery(query);
      this.modified = [];
    }
  }

  /**
   * Override default JSON.stringify behavior.
   * To Plain JS Object, not a string.
   * @return {object}
   */
  toJSON() {
    const data = {...this.data};
    for (const [key, val] of Object.entries(data)) {
      // Remove this property if val == null
      if (val != null && val.toJSON) {
        data[key] = val.toJSON();
      }
    }
    return data;
  }

}

module.exports = {GraphDBDocument}
