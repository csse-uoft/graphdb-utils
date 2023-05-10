import {expect} from 'chai';
import {GraphDB, createGraphDBModel, initGraphDB, MongoDBIdGenerator, GraphDBModelConstructor} from '../src';

describe("GraphDB Basics", function () {
  let repository;
  it('should connect to GraphDB', async function () {
    this.timeout(10000);
    const idGenerator = new MongoDBIdGenerator("mongodb://192.168.50.78:19345/gdb-utils");
    const namespaces = {
      "": "http://gdb-utils#",
      'cids': 'http://ontology.eil.utoronto.ca/cids/cids#',
      'foaf': 'http://xmlns.com/foaf/0.1/',
      'cwrc': 'http://sparql.cwrc.ca/ontologies/cwrc#',
    };

    const result = await initGraphDB({
      idGenerator,
      address: "http://192.168.50.111:7200",
      namespaces,
      repositoryName: 'gdb-utils',
    });
    repository = result.repository;
  });

  let PersonModel: GraphDBModelConstructor;
  it('should create a person model', function () {
    PersonModel = createGraphDBModel({
        familyName: {type: String, internalKey: 'foaf:familyName'},
        givenName: {type: String, internalKey: 'foaf:givenName'},
        gender: {type: String, internalKey: 'cwrc:hasGender'},
      }, {rdfTypes: ['cids:Person'], name: 'person'}
    );
  });

  it('should create a document', async function () {
    const person1 = PersonModel({
      familyName: 'last name',
      givenName: 'first name',
      gender: 'male'
    });
    const person = await person1.save();
  });

  it('should find all persons', async function () {
    const persons = await PersonModel.find({});
  });

  it('should create a document with uri', async function () {
    const person1 = PersonModel({
      familyName: 'last name',
      givenName: 'first name',
      gender: 'male'
    }, {uri: "http://test/person/1"});
    const person = await person1.save();
  });


});