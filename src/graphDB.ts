import {getRepository} from './loader';
import {SPARQL} from "./helpers";
import {GraphDBError} from "./graphDBError";

import {Term} from '@rdfjs/types';
import {streamToString} from "./utils";

const {GetQueryPayload, QueryType, UpdateQueryPayload} = require('graphdb').query;
const {RDFMimeType, QueryContentType} = require('graphdb').http;

/**
 * Get the hash tag from uri.
 * @param uri
 * @private
 * @returns {*|string}
 */
export function getGraphDBAttribute(uri: string) {
  const lst = uri.split("#")
  return lst[lst.length - 1]
}


export type onDataCb = (data: { [key: string]: Term }) => void;
type GDBRepository = any; // RDFRepositoryClient or BaseRepositoryClient

export const GraphDB = {
  sendSelectQuery: async (query: string, inference = false, onData: onDataCb, repository?: GDBRepository) => {
    repository = repository || await getRepository();

    const payload = new GetQueryPayload()
      .setQuery(query)
      .setQueryType(QueryType.SELECT)
      .setResponseType(RDFMimeType.SPARQL_RESULTS_JSON)
      .setInference(inference);

    try {
      const stream = await repository.query(payload);
      await new Promise<void>((resolve, reject) => {
        stream.on('data', onData);
        stream.on('finish', () => {
          resolve();
        });
        stream.on('error', (err: any) => {
          reject(err);
        })
      });
    } catch (e: any) {
      if (e.response.data.on)
        e.response.data = await streamToString(e.response.data);
      throw new GraphDBError('sendSelectQuery', e);
    }
  },

  sendUpdateQuery: async (query: string, repository?: GDBRepository) => {
    repository = repository || await getRepository();

    const time = Date.now();
    console.log(`------ Update query: ------\n${query.replaceAll(/prefix .*\n/gi, '')}`);
    try {
      const payload = new UpdateQueryPayload()
        .setQuery(query)
        .setContentType(QueryContentType.SPARQL_UPDATE)
        // .setInference(true)
        .setTimeout(5);

      await repository.update(payload);
    } catch (e: any) {
      // Rewrap to a more meaning error
      throw new GraphDBError('sendUpdateQuery', e);
    }
    console.log(`---------- ${Date.now() - time} ms -----------`);
  },

  sendConstructQuery: async (query: string, onData: onDataCb, inference = false, repository?: GDBRepository) => {
    repository = repository || await getRepository();

    const time = Date.now();
    console.log(`------ Construct query: -------\n${query.replaceAll(/prefix .*\n/gi, '')}`);

    const payload = new GetQueryPayload()
      .setQuery(query)
      .setQueryType(QueryType.CONSTRUCT)
      .setResponseType(RDFMimeType.JSON_LD)
      .setInference(inference)
      .setTimeout(5);

    try {
      const stream = await repository.query(payload);
      await new Promise<void>((resolve, reject) => {
        stream.on('data', onData);
        stream.on('finish', () => {
          resolve();
        });
        stream.on('error', (err: any) => {
          reject(err);
        })
      });
    } catch (e: any) {
      if (e.response.data.on)
        e.response.data = await streamToString(e.response.data);
      throw new GraphDBError('sendConstructQuery', e);
    }
    console.log(`---------- ${Date.now() - time} ms -----------`);
  },

  getAllInstancesWithLabel: async (type: string, repository?: GDBRepository): Promise<{ [key: string]: string }> => {
    const query = `
      ${SPARQL.getSPARQLPrefixes()}
      select * where {
        ?s rdf:type :${type} .
        ?s rdfs:label ?label .
      }`;

    const result: any = {};

    await GraphDB.sendSelectQuery(query, false, ({s, label}) => {
      result[s.value.match(/#([^#]*)/)![1]] = label.value;
    }, repository);

    return result;
  },

  getAllInstancesWithLabelComment: async (type: string, repository?: GDBRepository): Promise<{ [key: string]: { label: string, comment: string } }> => {
    const query = `
      ${SPARQL.getSPARQLPrefixes()}
      select * where {
        ?s rdf:type :${type} .
        ?s rdfs:label ?label .
        ?s rdfs:comment ?comment .
      }`;

    const result: any = {};
    await GraphDB.sendSelectQuery(query, false, ({s, label, comment}) => {
      result[s.value.match(/#([^#]*)/)![1]] = {
        label: label.value, comment: comment.value,
      };
    }, repository);

    return result;
  },
  isURIExisted: async (uri: string, repository?: GDBRepository) => {
    if (!uri.includes("://")) {
      uri = SPARQL.getFullURI(uri);
    }
    const query = `
      ${SPARQL.getSPARQLPrefixes()}
      select * where {
        <${uri}> ?p ?o .
      } LIMIT 1`;

    let existed = false;
    await GraphDB.sendSelectQuery(query, false, ({p, o}) => {
      existed = true;
    }, repository);
    return existed;
  }
}
