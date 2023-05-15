import {expect} from 'chai';
import dotenv from 'dotenv';
import {createGraphDBModel, DeleteType, GraphDBModelConstructor, initGraphDB, MongoDBIdGenerator} from '../src';

dotenv.config({path: `${__dirname}/.env`});

describe("GraphDB Basics", function () {
  let repository;
  it('should connect to GraphDB', async function () {
    this.timeout(10000);
    const idGenerator = new MongoDBIdGenerator(process.env.MONGODB || "mongodb://127.0.0.1:27017/gdb-utils");
    const namespaces = {
      "": "http://gdb-utils#",
      'cids': 'http://ontology.eil.utoronto.ca/cids/cids#',
      'foaf': 'http://xmlns.com/foaf/0.1/',
      'cwrc': 'http://sparql.cwrc.ca/ontologies/cwrc#',
    };

    const result = await initGraphDB({
      idGenerator,
      address: process.env.GRAPHDB || "http://127.0.0.1:7200",
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

  it('should cleanup person instances', async function () {
    await PersonModel.findAndDelete({});
  })

  it('should create documents', async function () {
    const person1 = PersonModel({
      familyName: 'last name',
      givenName: 'first name',
      gender: 'male'
    });
    const person2 = PersonModel({
      familyName: 'last name',
      givenName: 'first name',
      gender: 'male'
    });
    await person1.save();
    await person2.save();
  });

  it('should find all persons', async function () {
    const persons = await PersonModel.find({});
    expect(persons).has.length(2);
  });

  it('should create a document with uri', async function () {
    const person1 = PersonModel({
      familyName: 'last name',
      givenName: 'first name',
      gender: 'male'
    }, {uri: "http://test/person/1"});
    await person1.save();
  });

  it('should modify a document with uri', async function () {
    const person2 = PersonModel({
      familyName: 'last name',
      givenName: 'first name',
      gender: 'male'
    }, {uri: "http://test/person/2"});
    await person2.save();
    person2.givenName = "new given name";
    await person2.save();
    const foundPerson2 = await PersonModel.find({_uri: "http://test/person/2"});
    expect(foundPerson2.length === 0);
    expect(foundPerson2[0].givenName).eq("new given name");
  });

  it('should delete single person', async function () {
    const people = await PersonModel.find({});
    const peopleWithId = people.filter(person => person._id);
    const peopleWithUri = people.filter(person => !person._id);

    const deletedDocs = await PersonModel.findAndDelete({_uri: peopleWithUri[0]._uri});
    expect(deletedDocs).has.length(1);
    expect(await PersonModel.find({})).has.length(people.length - 1);

    const deletedDocs2 = await PersonModel.findAndDelete({_uri: peopleWithId[0]._uri});
    expect(deletedDocs).has.length(1);
    expect(await PersonModel.find({})).has.length(people.length - 2);

    const deletedDocs3 = await PersonModel.findAndDelete({_id: peopleWithId[1]._id});
    expect(deletedDocs).has.length(1);
    expect(await PersonModel.find({})).has.length(people.length - 3);

  });

  it('should delete all person', async function () {
    await PersonModel.findAndDelete({});
    expect(await PersonModel.find({})).length(0);
  });

  let AccountModel: GraphDBModelConstructor;
  it('should populate nested document', async function () {
    AccountModel = createGraphDBModel({
      person: {type: PersonModel, onDelete: DeleteType.CASCADE},
      username: String,
    }, {rdfTypes: [":Account"], name: 'account'});

    const account = AccountModel({
      person: {
        familyName: 'last name',
        givenName: 'first name',
        gender: 'male'
      },
      username: 'test'
    });
    await account.save();
    const accounts = await AccountModel.find({}, {populates: ['person']});
    expect(accounts).length.gt(0);
    expect(accounts[0]).property('person');
    expect(accounts[0].person).property('familyName').eq('last name');
  });

  it('should populate nested document with account uri', async function () {
    const accountUri = 'http://test/account/1';
    const account = AccountModel({
      person: {
        familyName: 'last name',
        givenName: 'first name',
        gender: 'male'
      },
      username: 'test2'
    }, {uri: accountUri});
    await account.save();
    const accounts = await AccountModel.find({_uri: accountUri}, {populates: ['person']});
    expect(accounts).length.gt(0);
    expect(accounts[0].username).eq('test2');
    expect(accounts[0]).property('person');
    expect(accounts[0].person).property('familyName').eq('last name');
  });

  it('should populate nested document with account uri + person uri', async function () {
    const accountUri = 'http://test/account/2';
    const personUri = 'http://test/person/2';

    const account = AccountModel({
      person: PersonModel({
        familyName: 'last name',
        givenName: 'first name',
        gender: 'male'
      }, {uri: personUri}),
      username: 'test3'
    }, {uri: accountUri});
    await account.save();
    const accounts = await AccountModel.find({_uri: accountUri}, {populates: ['person']});
    expect(accounts).length.gt(0);
    expect(accounts[0].username).eq('test3');
    expect(accounts[0]).property('person');
    expect(accounts[0].person._uri).eq(personUri);
  });

  let OrganizationModel: GraphDBModelConstructor;
  it('should populate array of nested document', async function () {
    OrganizationModel = createGraphDBModel({
      persons: {type: [PersonModel], onDelete: DeleteType.CASCADE},
      name: String,
    }, {rdfTypes: [":Organization"], name: 'organization'});

    const organization = OrganizationModel({
      persons: [
        {
          familyName: 'last name 1',
          givenName: 'first name',
          gender: 'male'
        },
        {
          familyName: 'last name 2',
          givenName: 'first name',
          gender: 'male'
        }
      ],
      name: 'test org'
    });
    await organization.save();
    const organizations = await OrganizationModel.find({}, {populates: ['persons']});
    expect(organizations).length.gt(0);
    expect(organizations[0]).property('persons');
    expect(organizations[0].persons).length(2);
  });

  it('should delete all accounts and organizaitons with users', async function () {
    await AccountModel.findAndDelete({});
    await OrganizationModel.findAndDelete({});

    expect(await AccountModel.find({})).length(0);
    expect(await OrganizationModel.find({})).length(0);
    expect(await PersonModel.find({})).length(0);
  });
});
