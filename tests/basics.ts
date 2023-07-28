import {createGraphDBModel, DeleteType, GraphDBModelConstructor, GraphDB} from "../src";
import {expect} from "chai";

export function basics(repository: any) {
  return async function () {
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
      const personUri = 'http://test/person/1';
      const person1 = PersonModel({
        familyName: 'last name',
        givenName: 'first name',
        gender: 'male'
      }, {uri: personUri});
      await person1.save();

      expect(await GraphDB.isURIExisted(personUri)).true;
      expect(await GraphDB.isURIExistedAsSubject(personUri)).true;
      expect(await GraphDB.isURIExistedAsObject(personUri)).false;
      expect(await GraphDB.isURIExisted(personUri + '1')).false;
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
    it('should create and populate nested document', async function () {
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

    it('should create and populate nested document with account uri', async function () {
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

    it('should create and populate nested document with account uri + person uri', async function () {
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

    it('should populate nested document with account uri + person uri given in the data', async function () {
      const accountUri2 = 'http://test/account/3';
      const personUri2 = 'http://test/person/3';
      const account2 = AccountModel({
        _uri: accountUri2,
        username: 'test4',
        person: {
          _uri: personUri2,
          familyName: 'last name',
          givenName: 'first name',
          gender: 'male'
        },
      });
      await account2.save();
      const accounts = await AccountModel.find({_uri: accountUri2}, {populates: ['person']});
      expect(accounts).length.gt(0);
      expect(accounts[0].username).eq('test4');
      expect(accounts[0]).property('person');
      expect(accounts[0].person._uri).eq(personUri2);

      // should delete the person doc as well
      account2.person = null;
      await account2.save();
      expect(await PersonModel.find({_uri: personUri2})).length(0);
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

    it('should modify nested document by giving new list', async function () {
      const organizations = await OrganizationModel.find({}, {populates: ['persons']});
      const oldPersonUris = [];
      for (const person of organizations[0].persons) {
        oldPersonUris.push(person._uri);
      }

      // Modify the persons list
      organizations[0].persons = [
        {
          familyName: 'last name 3',
          givenName: 'first name',
          gender: 'male'
        },
      ];
      await organizations[0].save();
      expect(await PersonModel.find({familyName: 'last name 3'})).length(1);
      // should reuse the old uri
      expect(await PersonModel.find({_uri: oldPersonUris[0]})).length(1);
      // should delete the second person
      expect(await PersonModel.find({_uri: oldPersonUris[1]})).length(0);

      // should delete all persons
      organizations[0].persons = [];
      await organizations[0].save()
    });

    it('should delete all accounts and organizaitons with users', async function () {
      await AccountModel.findAndDelete({});
      await OrganizationModel.findAndDelete({});

      expect(await AccountModel.find({})).length(0);
      expect(await OrganizationModel.find({})).length(0);
      expect(await PersonModel.find({})).length(0);
    });

    it('should create from nested data', async function () {
      const PhoneNumber = createGraphDBModel({
        phoneNumber: {type: Number}
      }, {rdfTypes: [':PhoneNumber'], name: 'phoneNumber'});

      const Person = createGraphDBModel({
        phoneNumber: {type: PhoneNumber, onDelete: DeleteType.CASCADE},
      }, {rdfTypes: [':Person'], name: 'person'});

      const UserAccount = createGraphDBModel({
        person: {type: Person, onDelete: DeleteType.CASCADE}
      }, {rdfTypes: [':UserAccount'], name: 'userAccount'});

      const account1 = UserAccount({
        person: {
          phoneNumber: {
            phoneNumber: 123456789
          }
        }
      });
      await account1.save();

      const accounts = await UserAccount.find({}, {populates: ['person.phoneNumber']})
      expect(accounts[0].person.phoneNumber.phoneNumber).eq(123456789)

      await UserAccount.findAndDelete({});
      expect(await UserAccount.find({})).length(0);
      expect(await Person.find({})).length(0);
      expect(await PhoneNumber.find({})).length(0);
    });

    it('should get empty documents', async function () {
      const EmptyModel = createGraphDBModel({
      }, {rdfTypes: [':Empty'], name: 'empty'});
      await EmptyModel({}).save();
      expect(await EmptyModel.find({})).length(1);
    });
  }
}
