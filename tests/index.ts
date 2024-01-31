import {expect} from 'chai';
import dotenv from 'dotenv';
import {
  createGraphDBModel,
  DeleteType,
  GraphDB,
  GraphDBModelConstructor,
  initGraphDB,
  MongoDBIdGenerator
} from '../src';
import {basics} from "./basics";
import {doubleSave} from "./doubleSave";
import {generateDeleteQuery} from "./generateDeleteQuery";
import {MaxCallStackSize} from "./maxCall";
import {RemoveIndicatorFromOrg} from "./removeIndicatorFromOrg";
import {PopulateIssue} from "./populateIssue";
import {doubleRDFTypes} from "./doubleRDFTypes";
import {filterForList} from "./filterForList";
import {emptyInstance} from "./emptyInstance";
import {transaction} from "./transaction";
import {usingBoolean} from "./usingBoolean";
import {UUIDGenerator} from "../src/idGenerator/uuidGenerator";

dotenv.config({path: `${__dirname}/.env`});

export let repository: any;
describe("GraphDB", function () {
  const idGenerators = [
    new MongoDBIdGenerator(process.env.MONGODB || "mongodb://127.0.0.1:27017/gdb-utils"),
    new UUIDGenerator()
  ];
  for (const idGenerator of idGenerators) {
    describe('Using ' + idGenerator.constructor.name, function () {
      it('should connect to GraphDB', async function () {
        this.timeout(10000);
        const namespaces = {
          "": "http://gdb-utils#",
          'cids': 'http://ontology.eil.utoronto.ca/cids/cids#',
          'foaf': 'http://xmlns.com/foaf/0.1/',
          'cwrc': 'http://sparql.cwrc.ca/ontologies/cwrc#',
          'tove_org': 'http://ontology.eil.utoronto.ca/tove/organization#',
          'iso21972': 'http://ontology.eil.utoronto.ca/ISO21972/iso21972#',
        };

        const result = await initGraphDB({
          idGenerator,
          address: process.env.GRAPHDB || "http://127.0.0.1:7200",
          namespaces,
          repositoryName: 'gdb-utils',
          username: process.env.GRAPHDB_USERNAME,
          password: process.env.GRAPHDB_PASSWORD,
          debug: true
        });
        repository = result.repository;
      });
      it('should clear default graph', async function () {
        await GraphDB.sendUpdateQuery(`CLEAR DEFAULT`);
      });

      describe('Basics', basics(repository));
      describe('Double Save', doubleSave(repository));
      describe('Delete Query', generateDeleteQuery(repository));
      describe('Max Call Stack', MaxCallStackSize(repository));
      describe('Remove Indicator From Org', RemoveIndicatorFromOrg(repository))
      describe('PopulateIssue', PopulateIssue(repository))
      describe('double RDFTypes', doubleRDFTypes(repository))
      describe('filter for lists', filterForList(repository))
      describe('Empty instance', emptyInstance(repository))
      describe('Transactions', transaction(repository))
      describe('usingBoolean', usingBoolean(repository))
    });
  }
});
