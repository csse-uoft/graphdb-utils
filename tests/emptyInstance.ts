import {createGraphDBModel, DeleteType, GraphDBModelConstructor} from "../src";
import {expect} from "chai";

export function emptyInstance(repository: any) {
  return async function () {
    let PersonModel: GraphDBModelConstructor,  OrganizationModel: GraphDBModelConstructor;

    it('should create models', function () {
      PersonModel = createGraphDBModel({
        name: {type: String, internalKey: 'cids:hasName'},
      }, {
        rdfTypes: [':PersonTest'], name: 'personTest'
      });

      OrganizationModel =  createGraphDBModel({
        person: {type: PersonModel, internalKey: ':hasPerson'},
      }, {
        rdfTypes: [':OrgTest'], name: 'orgTest'
      });
    });
    it('should create empty instance', async function () {
      const person = PersonModel({
        _uri: "http://person_1"
      });
      await person.save();

      const persons = await PersonModel.find({});
      expect(persons).length(1);
    });

    it('should create nested empty instance - syntax 1', async  function () {
      await PersonModel.findAndDelete({});
      await OrganizationModel.findAndDelete({});

      // This syntax treat the person as a new person instance with no properties
      const org = OrganizationModel({
        person: {
          _uri:  "http://person_2"
        }
      });
      await org.save();

      // The person instance should be created by this syntax, i.e. `rdf:type` is created for http://person_2
      const persons = await PersonModel.find({});
      expect(persons).length(1);

      // But the triple `org` :hasPerson <http://person_2> should be there
      const orgFound: any = await OrganizationModel.findOne({});
      expect(orgFound.person).eq('http://person_2');

      // Populate should work
      await orgFound.populate("person");
      expect(orgFound.person._uri).eq('http://person_2');
    });

    it('should create nested empty instance - syntax 2', async  function () {
      await PersonModel.findAndDelete({});
      await OrganizationModel.findAndDelete({});

      // This syntax treat the person as an existing person instance.
      const org = OrganizationModel({
        person: "http://person_2"
      });
      await org.save();

      // The person instance should not be created when giving an uri, i.e. there is not `rdf:type` associated to the http://person_2
      const persons = await PersonModel.find({});
      expect(persons).length(0);

      // But the triple `org` :hasPerson <http://person_2> should be there
      const orgFound: any = await OrganizationModel.findOne({});
      expect(orgFound.person).eq('http://person_2');

      // Note: Populate should not work in this case
    });

    it('should create empty instance', async  function () {
      await PersonModel.findAndDelete({});
      await OrganizationModel.findAndDelete({});

      const org = OrganizationModel({}, {});
      await org.save();
      const org2 = OrganizationModel({}, {uri: "http://orgTest2"});
      await org2.save();

      const orgs = await OrganizationModel.find({});
      expect(orgs).length(2);
    });
  }
}
