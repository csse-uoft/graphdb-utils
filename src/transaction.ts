import TransactionalRepositoryClient from "graphdb/lib/transaction/transactional-repository-client";
import {getRepository} from "./loader";
import TransactionIsolationLevel from "graphdb/lib/transaction/transaction-isolation-level";
const {SparqlJsonResultParser, JsonLDParser} = require('graphdb').parser;

export {TransactionIsolationLevel};

// Fix https://github.com/Ontotext-AD/graphdb.js/issues/188
TransactionalRepositoryClient.prototype.query = function (payload: any) {
  const serviceRequest = this.queryService.query(payload);
  serviceRequest.getHttpRequestBuilder().setData(payload.payload.query)
  serviceRequest.getHttpRequestBuilder().setHeaders({
    ...serviceRequest.getHttpRequestBuilder().getHeaders(),
    'Content-Type': 'application/sparql-query'
  })
  this.decorateServiceRequest(serviceRequest, 'QUERY');
  return serviceRequest.execute();
}

export class Transaction {
  static client: TransactionalRepositoryClient | undefined;
  static TransactionIsolationLevel = TransactionIsolationLevel;
  static async beginTransaction(isolationLevel?: TransactionIsolationLevel) {
    if (this.client) {
      throw Error("Transaction: You can only have one transaction at a time.");
    }
    this.client = await (await getRepository()).beginTransaction(isolationLevel);
    this.client!.registerParser(new SparqlJsonResultParser());
    this.client!.registerParser(new JsonLDParser());
  }

  static async commit() {
    if (!this.client) {
      throw Error("Transaction: 'beginTransaction' should be called before 'commit'");
    }
    await this.client.commit();
    this.client = undefined;
  }

  static async rollback() {
    if (!this.client) {
      throw Error("Transaction: 'beginTransaction' should be called before 'rollback'");
    }
    await this.client.rollback();
    this.client = undefined;
  }
}
