import {createGraphDBModel, DeleteType, GraphDBModelConstructor} from "../src";
import {expect} from "chai";

export function doubleRDFTypes(repository: any) {
    return async function () {
        let  GDBOrganizationModel: GraphDBModelConstructor, GDBStakeholerModel: GraphDBModelConstructor, GDBUserAccountModel: GraphDBModelConstructor,
            GDBOrganizationIdModel: GraphDBModelConstructor, GDBIndicatorModel: GraphDBModelConstructor, GDBOutcomeModel: GraphDBModelConstructor,
            GDBPhoneNumberModel: GraphDBModelConstructor;

        it('should create models', function () {
            GDBOrganizationModel = createGraphDBModel({
                comment: {type: String, internalKey: 'rdfs:comment'},
            }, {
                rdfTypes: ['cids:Organization'], name: 'organization'
            });

            GDBStakeholerModel = createGraphDBModel({
            },{
                rdfTypes: ['cids:Organization', 'cids:Stakeholder'], name: 'stakeholder'
            })
        })



        it('should create a stakeholder and fetch it out', async function () {

            const stakeholer = GDBStakeholerModel({
            }, {uri: 'https://stakeholder.ca'});
            await stakeholer.save();

            expect(await GDBOrganizationModel.find({})).length(5);
            expect(await GDBStakeholerModel.find({})).length(1)
        });
    }
}
