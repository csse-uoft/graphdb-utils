import {createGraphDBModel, DeleteType, GraphDBModelConstructor, Types} from "../src";
import {expect} from "chai";

export function PopulateIssue(repository: any) {
    return async function () {
        let  GDBOrganizationModel: GraphDBModelConstructor, Group: GraphDBModelConstructor, GDBUserAccountModel: GraphDBModelConstructor,
            GDBOrganizationIdModel: GraphDBModelConstructor, GDBIndicatorModel: GraphDBModelConstructor, GDBOutcomeModel: GraphDBModelConstructor,
            GDBPhoneNumberModel: GraphDBModelConstructor, GDBUnitOfMeasure: GraphDBModelConstructor, GDBIndicatorReportModel: GraphDBModelConstructor;

        it('should create models', function () {


            GDBOutcomeModel = createGraphDBModel({
                name: {type: String, internalKey: 'tove_org:hasName'},
                description: {type: String, internalKey: 'cids:hasDescription'},
                forOrganization: {type: Types.NamedIndividual, internalKey: 'cids:forOrganization'},
                indicators: {type:　[() => GDBIndicatorModel], internalKey: 'cids:hasIndicator'},
            }, {
                rdfTypes: ['cids:Outcome'], name: 'outcome'
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



        it('should fetch the outcome and populate its indicator', async function () {
            const outcome = GDBOutcomeModel({
                name: 'outcome1',
            })
            await outcome.save();
            const indicator1 = GDBIndicatorModel({
                name: 'ind1',
                forOutcomes: [outcome]
            })
            await indicator1.save();
            outcome.indicators = [indicator1];
            await outcome.save();

            expect(await GDBOutcomeModel.find({_uri: outcome._uri}, {populates: ['indicators']}));
        });
    }
}

