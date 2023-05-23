import {createGraphDBModel, DeleteType, GraphDBModelConstructor} from "../src";
import {expect} from "chai";

export function generateDeleteQuery(repository: any) {
  return async function () {
    let  GDBOrganizationModel: GraphDBModelConstructor, Group: GraphDBModelConstructor, GDBUserAccountModel: GraphDBModelConstructor,
    GDBOrganizationIdModel: GraphDBModelConstructor, GDBIndicatorModel: GraphDBModelConstructor, GDBOutcomeModel: GraphDBModelConstructor,
        GDBPhoneNumberModel: GraphDBModelConstructor;

    it('should create models', function () {
      GDBOrganizationModel = createGraphDBModel({
        comment: {type: String, internalKey: 'rdfs:comment'},
      }, {
        rdfTypes: ['cids:Organization'], name: 'organization'
      });

      Group = createGraphDBModel({
        label: {type: String, internalKey: 'rdfs:label'},
        comment: {type: String, internalKey: 'rdfs:comment'},
        administrator: {type: GDBUserAccountModel, internalKey: ':hasAdministrator'},
        organizations: {type: [GDBOrganizationModel], internalKey: ':hasOrganization'},
      }, {
        rdfTypes: [':Group'], name: 'group'
      });
    })



    it('should remove an organization from group but not delete the organization instance', async function () {
      const organization = GDBOrganizationModel({
        comment: 'org1'
      })
      const group = Group({
        label: 'group1',
        administrator: {},
        organizations: [organization]
      });
      await group.save();
      group.organizations = [];
      await group.save();

      expect(await GDBOrganizationModel.find({})).length(1);
    });
  }
}

