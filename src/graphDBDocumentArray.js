const {GraphDBDocument} = require('./graphDBDocument');
const {GraphDB, getGraphDBAttribute} = require('./graphDB');
const {getIdFromIdentifier, pathsToObj, graphDBValueToJsValue, SPARQL} = require('./helpers');

const generateQuery = (doc, populate, cnt = 0) => {
  const whereClause = [], paths = [];

  for (const currKey of Object.keys(populate)) {
    // Skip if the field does not exist, there is no way to populate
    if (doc[currKey] === undefined)
      continue;

    // If the field is not yet populated
    if (!(doc[currKey] instanceof GraphDBDocument || (Array.isArray(doc[currKey]) && doc[currKey][0] instanceof GraphDBDocument))) {
      const {whereClause: innerWhere} = doc.getPopulateQuery(currKey, cnt++);
      whereClause.push(...innerWhere);
      paths.push(currKey);
    }
    // If the field is populated and there are nested fields waiting for populate
    else if (Object.keys(populate[currKey]).length > 0) {
      if (Array.isArray(doc[currKey])) {
        for (const [idx, currDoc] of doc[currKey].entries()) {
          const {whereClause: innerWhere, paths: innerPaths} = generateQuery(currDoc, populate[currKey], cnt);
          whereClause.push(...innerWhere);
          paths.push(...innerPaths.map(item => `${currKey}.${idx}.${item}`));
        }
      } else {
        const {whereClause: innerWhere, paths: innerPaths} = generateQuery(doc[currKey], populate[currKey], cnt);
        whereClause.push(...innerWhere);
        paths.push(...innerPaths.map(item => `${currKey}.${item}`));
      }

    }
  }
  return {whereClause, paths};
}

/**
 * Performance optimized for multiple populates.
 * @class GraphDBDocumentArray
 * @extends {Array}
 */
class GraphDBDocumentArray extends Array {

  /**
   * populate a single property for every document.
   * @param {string} path - e.g. 'primary_contact'
   * @return {Promise<GraphDBDocumentArray>}
   */
  async populate(path) {
    return this.populateMultiple([path]);
  }

  /**
   * Populate multiple properties for every document.
   * Breadth first populate for combining queries.
   * @param {string[]} paths - e.g. ['primary_contact', 'organization']
   * @return {Promise<GraphDBDocumentArray>}
   */
  async populateMultiple(paths) {
    paths = [...paths];
    paths.sort();
    const populate = pathsToObj(paths);


    const generate = () => {
      let whereClause = [], paths = [], cnt = 0;
      for (const [idx, doc] of this.entries()) {
        const {whereClause: innerWhereClause, paths: innerPaths} = generateQuery(doc, populate, cnt);
        cnt += innerWhereClause.length;
        whereClause.push(...innerWhereClause);
        paths.push(...innerPaths);
      }
      paths = [...new Set(paths)];
      whereClause = [...new Set(whereClause)];
      return {whereClause, paths}
    }

    let whereClause = [];
    while (({whereClause, paths} = generate()).whereClause.length > 0) {
      const query = `${SPARQL.getSPARQLPrefixes()}\nCONSTRUCT {?s ?p ?o} WHERE {\n\t?s ?p ?o\nFILTER (\n\t${whereClause.join(' ||\n\t')}\n\t)\n}`;
      const data = {};

      /**
       * @type {Map<string, Map<string, Term[]>>}
       */
      const subject2Triples = new Map();
      /**
       * @type {Map<string, string[]>}
       */
      const rdfType2Subjects = new Map();

      /**
       * @type {Map<string, string>}
       */
      const subject2RdfType = new Map();

      await GraphDB.sendConstructQuery(query, ({subject, predicate, object}) => {

        subject = subject.value;
        predicate = SPARQL.getPrefixedURI(predicate.value);
        const objectValue = object.termType === 'NamedNode' ? object.value : object.value;

        if (predicate === "rdf:type" && object.termType === 'NamedNode' && object.value !== 'http://www.w3.org/2002/07/owl#NamedIndividual') {
          if (rdfType2Subjects.has(object.value)) {
            rdfType2Subjects.get(object.value).push(subject);
          } else {
            rdfType2Subjects.set(object.value, [subject]);
          }
          subject2RdfType.set(subject, object.value)
        }

        if (!subject2Triples.has(subject)) {
          subject2Triples.set(subject, new Map([[predicate, [objectValue]]]));
        } else {
          if (!subject2Triples.get(subject).has(predicate)) {
            subject2Triples.get(subject).set(predicate, [objectValue]);
          } else {
            subject2Triples.get(subject).get(predicate).push(objectValue);
          }
        }
      });

      // construct data object: uri -> {predicate: value, ...}
      for (const [rdfType, subjects] of rdfType2Subjects) {
        const nestedModel = this[0].model.nestedType2Model.get(rdfType);
        // ignore unknown rdf:type
        if (!nestedModel) continue;

        for (const subject of subjects) {
          for (const [predicate, objects] of subject2Triples.get(subject) || []) {
            const option = nestedModel.internalKey2Option.get(predicate);
            // ignore unknown predicates
            if (!option) continue;
            for (const object of objects || []) {
              const objectJS = graphDBValueToJsValue(object, Array.isArray(option.type) ? option.type[0] : option.type);
              const predicateJS = option.externalKey;

              if (!data[subject]) data[subject] = {};
              if (Array.isArray(option.type)) {
                if (!data[subject][predicateJS]) data[subject][predicateJS] = [];
                data[subject][predicateJS].push(objectJS);
              } else {
                data[subject][predicateJS] = objectJS;
              }
            }
          }
        }
      }

      for (const path of paths) {
        for (const doc of this.values()) {
          // This can be a string or an array, instance identifier(s)
          const instanceUris = doc.get(path);

          // Skip undefined/empty predicate
          if (instanceUris == null) continue;

          const rdfType = subject2RdfType.get((Array.isArray(instanceUris) ? instanceUris[0] : instanceUris));
          const nestedModel = doc.model.nestedType2Model.get(rdfType);

          if (!nestedModel) {
            console.error('Cannot populate: ', instanceUris.toString(), 'Model not found.');
          }

          let newValue;
          if (Array.isArray(instanceUris)) {
            newValue = new GraphDBDocumentArray();
            for (const instanceUri of instanceUris) {
              if (typeof instanceUri !== "string")
                throw new Error("GraphDBDocument.populateMultiple: Internal Error 1");

              let _id;
              // use regex for accurate matching
              const re = new RegExp(`^${SPARQL.getFullURI(nestedModel.schemaOptions.name)}_([0-9]*)$`);
              const matchResult = instanceUri.match(re);
              if (matchResult) {
                _id = matchResult[1];
              }
              newValue.push(new GraphDBDocument({
                data: _id ? {_id, ...data[instanceUri]} : {...data[instanceUri]},
                model: nestedModel, uri: instanceUri
              }));
            }
          } else {
            const instanceUri = instanceUris;
            if (typeof instanceUris !== "string")
              throw new Error("GraphDBDocument.populateMultiple: Error 1");

            let _id;
            // use regex for accurate matching
            const re = new RegExp(`^${SPARQL.getFullURI(nestedModel.schemaOptions.name)}_([0-9]*)$`);
            const matchResult = instanceUri.match(re);
            if (matchResult) {
              _id = matchResult[1];
            }
            newValue = new GraphDBDocument({
              data: _id ? {_id, ...data[instanceUri]} : {...data[instanceUri]},
              model: nestedModel, uri: instanceUri
            });
          }

          doc.set(path, newValue, true);
        }

      }
    }
    return this;
  }

  /**
   * Override default JSON.stringify behavior.
   * To Plain JS Object, not a string.
   * @return {object}
   */
  toJSON() {
    const data = [];
    for (const val of this) {
      if (val.toJSON) {
        data.push(val.toJSON());
      } else {
        data.push(val);
      }
    }
    return data;
  }
}

module.exports = {GraphDBDocumentArray}
