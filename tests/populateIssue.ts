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
                forOrganization: {type: () => GDBOrganizationModel, internalKey: 'cids:forOrganization'},
                indicators: {type:　[() => GDBIndicatorModel], internalKey: 'cids:hasIndicator'},
            }, {
                rdfTypes: ['cids:Outcome'], name: 'outcome'
            });

            GDBOrganizationModel = createGraphDBModel({
                comment: {type: String, internalKey: 'rdfs:comment'}
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

        it('should fetch the outcome and populate its indicator', async function () {
            const outcome = GDBOutcomeModel({
                name: 'outcome1',
                forOrganization: GDBOrganizationModel({
                    comment: 'Org1'
                })
            })
            await outcome.save();
            const indicator1 = GDBIndicatorModel({
                name: 'ind1',
                forOutcomes: [outcome]
            })
            await indicator1.save();
            outcome.indicators = [indicator1];
            await outcome.save();
            // @ts-ignore
            const organizationURIs = [outcome.forOrganization._uri];
            expect(await GDBOutcomeModel.find({_uri: outcome._uri, forOrganization: {$in: []}}, {populates: ['indicators']}));
            expect(await GDBOutcomeModel.find({_uri: outcome._uri}, {populates: ['indicators']}));
            const result = await GDBOutcomeModel.find({});
            expect(result)
        });
    }
}

