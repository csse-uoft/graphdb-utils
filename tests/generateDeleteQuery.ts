import {createGraphDBModel, DeleteType, GraphDBModelConstructor} from "../src";
import {expect} from "chai";

export function generateDeleteQuery(repository: any) {
  return async function () {
    let PhoneNumber: GraphDBModelConstructor, Organization: GraphDBModelConstructor;
    it('should create models', function () {
      const Group = createGraphDBModel({
        label: {type: String, internalKey: 'rdfs:label'},
        comment: {type: String, internalKey: 'rdfs:comment'},
        administrator: {type: GDBUserAccountModel, internalKey: ':hasAdministrator'},
        organizations: {type: [GDBOrganizationModel], internalKey: ':hasOrganization'},
      }, {
        rdfTypes: [':Group'], name: 'group'
      });

      const Organization = createGraphDBModel({
        comment: {type: String, internalKey: 'rdfs:comment'},
      }, {
        rdfTypes: ['cids:Organization'], name: 'organization'
      });

     

    it('should not create duplicated nested instance', async function () {
      const group = Group({
        label: 'group1'
        organizations: [{comment: 'org1'}]
      });
      await group.save();
      group.organizations = [];
      await group.save();
<!--       expect(await UserAccount.find({})).length(1);
      expect(await Person.find({})).length(1);
      expect(await Address.find({})).length(2);
      expect(await PhoneNumber.find({})).length(1); -->
    });
  }
}
