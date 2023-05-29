import {expect} from 'chai';
import dotenv from 'dotenv';
import {
  createGraphDBModel,
  DeleteType,
  GraphDB,
  GraphDBModelConstructor,
  initGraphDB,
  MongoDBIdGenerator,
  Types
} from '../src';
import {basics} from "./basics";
import {doubleSave} from "./doubleSave";
import {generateDeleteQuery} from "./generateDeleteQuery";
import {MaxCallStackSize} from "./maxCall";


export function RemoveIndicatorFromOrg(repository: any) {
  return async function () {
    let  GDBOrganizationModel: GraphDBModelConstructor, Group: GraphDBModelConstructor, GDBUserAccountModel: GraphDBModelConstructor,
      GDBOrganizationIdModel: GraphDBModelConstructor, GDBIndicatorModel: GraphDBModelConstructor, GDBOutcomeModel: GraphDBModelConstructor,
      GDBPhoneNumberModel: GraphDBModelConstructor, GDBUnitOfMeasure: GraphDBModelConstructor, GDBIndicatorReportModel: GraphDBModelConstructor;

    it('should create models', function () {
      GDBOrganizationModel = createGraphDBModel({
        comment: {type: String, internalKey: 'rdfs:comment'},
        hasUsers: {type: [GDBUserAccountModel], internalKey: ':hasUser'},
        administrator: {type: GDBUserAccountModel, internalKey: ':hasAdministrator'},
        reporters: {type: [GDBUserAccountModel], internalKey: ':hasReporter'},
        editors: {type: [GDBUserAccountModel], internalKey: ':hasEditor'},
        researchers: {type: [GDBUserAccountModel], internalKey: ':hasResearcher'},
        legalName:{type: String, internalKey:'tove_org:hasLegalName'},
        hasId: {type: GDBOrganizationIdModel, internalKey: 'tove_org:hasID', onDelete: DeleteType.CASCADE}, // contains organization number
        hasIndicators: {type: [Types.NamedIndividual], internalKey: 'cids:hasIndicator'},
        hasOutcomes: {type: [GDBOutcomeModel], internalKey: 'cids:hasOutcome', onDelete: DeleteType.CASCADE},
        telephone: {type: GDBPhoneNumberModel, internalKey: 'ic:hasTelephone', onDelete: DeleteType.CASCADE},
        contactName: {type: String, internalKey: ':hasContactName'},
        email: {type: String, internalKey: ':hasEmail'},
      }, {
        rdfTypes: ['cids:Organization'], name: 'organization'
      });

      GDBIndicatorModel = createGraphDBModel({
        name: {type: String, internalKey: 'tove_org:hasName'},
        description: {type: String, internalKey: 'cids:hasDescription'},
        forOutcomes: {type: [GDBOutcomeModel], internalKey: 'cids:forOutcome'},
        indicatorReports: {type: [GDBIndicatorReportModel], internalKey: 'cids:hasIndicatorReport'},
        forOrganizations: {type: [GDBOrganizationModel], internalKey: 'cids:forOrganization'},
        unitOfMeasure: {type: GDBUnitOfMeasure, internalKey: 'iso21972:hasUnit'},
      }, {
        rdfTypes: ['cids:Indicator'], name: 'indicator'
      });



    })



    it('should add the indicator to the organization', async function () {
      const organization = GDBOrganizationModel({
        comment: 'org1',
      })
      await organization.save();
      const indicator1 = GDBIndicatorModel({
        name: 'ind1',
        forOrganizations: [organization],
      })
      await indicator1.save();
      organization.hasIndicators = [indicator1];
      await organization.save();
      const formOrganizations = [organization];
      const uri = indicator1._uri;

      const indicator = await GDBIndicatorModel.findOne({_uri: uri}, {populates: ['forOrganizations']});
      expect((indicator as any).forOrganizations[0].hasIndicators).length(1)
      await Promise.all((indicator as any).forOrganizations.map((org: any) => {
        const index = org.hasIndicators.indexOf(uri);
        org.hasIndicators.splice(index, 1);
        return org.save();
      }));

      const org = await GDBOrganizationModel.findOne({_uri: organization._uri});
      expect((org as any).hasIndicators).to.be.oneOf([null, undefined])

    });
  }
}
