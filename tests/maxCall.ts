import {createGraphDBModel, DeleteType, GraphDBModelConstructor, Types} from "../src";
import {expect} from "chai";

export function MaxCallStackSize(repository: any) {
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
                hasIndicators: {type: [GDBIndicatorModel], internalKey: 'cids:hasIndicator'},
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



        it('should remove an organization from group', async function () {
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

            // remove the indicator from every organizations in indicator.forOrganizations
            await Promise.all((indicator1.forOrganizations as any).map((organization: any ) => {
                const index = organization.hasIndicators.findIndex((indicator: any) => indicator._uri === uri);
                organization.hasIndicators.splice(index, 1);
                return organization.save();
            }));

            // add the indicator to every organizations in form.organizations
            await Promise.all(formOrganizations.map(organization => {
                if (!organization.hasIndicators)
                    organization.hasIndicators = [];
                (organization.hasIndicators as any).push(indicator1);
                return organization.save();
            }));

            indicator1.forOrganizations = formOrganizations;

            expect( await indicator1.save());
        });
    }
}

