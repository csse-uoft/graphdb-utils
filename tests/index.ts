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

dotenv.config({path: `${__dirname}/.env`});

export let repository: any;
describe("GraphDB", function () {
  describe('init', function () {
    it('should connect to GraphDB', async function () {
      this.timeout(10000);
      const idGenerator = new MongoDBIdGenerator(process.env.MONGODB || "mongodb://127.0.0.1:27017/gdb-utils");
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
      });
      repository = result.repository;
    });
    it('should clear default graph', async function () {
      await GraphDB.sendUpdateQuery(`CLEAR DEFAULT`);
    });
  });
  // describe('Basics', basics(repository));
  // describe('Double Save', doubleSave(repository));
  // describe('Delete Query', generateDeleteQuery(repository));
  // describe('Max Call Stack', MaxCallStackSize(repository));
  // describe('Remove Indicator From Org', RemoveIndicatorFromOrg(repository))
  describe('PopulateIssue', PopulateIssue(repository))
});
