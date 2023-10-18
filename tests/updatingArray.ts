import {createGraphDBModel, DeleteType, GraphDBModelConstructor, Transaction, TransactionIsolationLevel} from "../src";
import {expect} from "chai";
import {sleep} from "../src/utils";

export function updatingArray(repository: any) {
    return async function () {
        let PersonModel: GraphDBModelConstructor, OrganizationModel: GraphDBModelConstructor;

        it('should create models', function () {
            PersonModel = createGraphDBModel({
                name: {type: String, internalKey: 'cids:hasName'},
                organizations : {type: String, internalKey: ':inOrganization'}
            }, {
                rdfTypes: [':PersonTest'], name: 'personTest'
            });

            OrganizationModel = createGraphDBModel({
                name: {type: String, internalKey: 'cids:hasName'}
            }, {
                rdfTypes: [':OrganizationTest'], name: 'organizationTest'
            });
        });
        it('create a person with an organization', async function () {
            await Transaction.beginTransaction();
            const organization1 = OrganizationModel({
                name: 'org1'
            })
            await organization1.save();
            const person = PersonModel({
                name: "Person1",
                organizations: [organization1._uri]
            });
            await person.save();
            await Transaction.commit();

            const thePerson = await PersonModel.findOne({name: 'Person1'});
            expect((thePerson as any).organizations).length(1);

        });

        it('should add another organization to the person', async function () {
            await Transaction.beginTransaction();
            const person = await PersonModel.findOne({name: 'Person1'});
            const organization2 = OrganizationModel({
                name: 'org2'
            })
            await organization2.save();
            (person as any).organizations.push(organization2._uri);
            await person.save();

            await Transaction.commit();

            const thePerson = await PersonModel.findOne({name: 'Person1'});
            expect((thePerson as any).organizations).length(2);
        });
    }
}