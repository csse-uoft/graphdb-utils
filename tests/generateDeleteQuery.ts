import {createGraphDBModel, DeleteType, GraphDBModelConstructor} from "../src";
import {expect} from "chai";

export function generateDeleteQuery(repository: any) {
  return async function () {
    let  Organization: GraphDBModelConstructor, Group: GraphDBModelConstructor;
    it('should create models', function () {
      const Organization = createGraphDBModel({
        comment: {type: String, internalKey: 'rdfs:comment'},
      }, {
        rdfTypes: ['cids:Organization'], name: 'organization'
      });

      const Group = createGraphDBModel({
        label: {type: String, internalKey: 'rdfs:label'},
        comment: {type: String, internalKey: 'rdfs:comment'},
        organizations: {type: [Organization], internalKey: ':hasOrganization'},
      }, {
        rdfTypes: [':Group'], name: 'group'
      });
    })



    it('should not remove an organization from group', async function () {
      const group = Group({
        label: 'group1',
        organizations: [{comment: 'org1'}]
      });
      await group.save();
      group.organizations = [];
      await group.save();
      expect(await Group.findOne({})).to.have.property('organizations').length(0);
    });
  }
}

