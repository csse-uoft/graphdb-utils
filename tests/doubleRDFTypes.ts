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
                rdfTypes: ['cids:Organization2'], name: 'organization2'
            });

            GDBStakeholerModel = createGraphDBModel({
                name: {type: String, internalKey: 'cids:hasName'},
                comment: {type: String, internalKey: 'rdfs:comment'},
            },{
                rdfTypes: ['cids:Organization2', 'cids:Stakeholder'], name: 'stakeholder'
            })
        })

        it('should create a stakeholder and fetch it out', async function () {

            const stakeholer = GDBStakeholerModel({
                name: "Test",
                comment: "comment-test"
            }, {uri: 'https://stakeholder.ca'});
            await stakeholer.save();

            const organizations = await GDBOrganizationModel.find({});
            expect(organizations).length(1);
            expect(organizations[0].comment).eq('comment-test')

            const stakeholders = await GDBStakeholerModel.find({});
            expect(stakeholders).length(1);
            expect(stakeholders[0].name).eq('Test');
            expect(stakeholders[0].comment).eq('comment-test');

        });

        it('should work with nested populate', async function () {
            const OuterModel = createGraphDBModel({
                stakeholder: {type: GDBStakeholerModel, internalKey: 'cids:hasStakeholder'},
            },{
                rdfTypes: [':Outer'], name: 'outer'
            });
            await OuterModel({
                stakeholder: {
                    name: "Test",
                    comment: "comment-test"
                }
            }).save();

            const outers = await OuterModel.find({});
            expect(outers).length(1);

            const outers2 = await OuterModel.find({}, {populates: ["stakeholder"]});
            expect(outers2).length(1);
            expect(outers2[0].stakeholder.name).eq('Test');
            expect(outers2[0].stakeholder.comment).eq('comment-test');

            const organizations = await GDBOrganizationModel.find({});
            expect(organizations).length(2);
            expect(organizations[0].comment).eq('comment-test')

            const stakeholders = await GDBStakeholerModel.find({});
            expect(stakeholders).length(2);
            expect(stakeholders[0].name).eq('Test');
            expect(stakeholders[0].comment).eq('comment-test');

        });
    }
}
