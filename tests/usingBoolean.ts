import {createGraphDBModel, GraphDBModelConstructor} from "../src";
import {expect} from "chai";

export function usingBoolean(repository: any) {
    return async function () {
        let PersonModel: GraphDBModelConstructor, OrganizationModel: GraphDBModelConstructor;

        it('should create models', function () {
            PersonModel = createGraphDBModel({
                name: {type: String, internalKey: 'cids:hasName'},
                hasName: {type: Boolean, internalKey: ":hasName"}
            }, {
                rdfTypes: [':PersonTest'], name: 'personTest'
            });

        });
        it('create a person with false', async function () {
            const person = PersonModel({
                name: "PersonBoolean1",
                hasName: false
            });
            await person.save();

            const thePerson = await PersonModel.findOne({name: 'PersonBoolean1'});
            expect((thePerson as any).hasName).eq(false);
        });

        it('create a person with true', async function () {
            const person = PersonModel({
                name: "PersonBoolean2",
                hasName: true
            });
            await person.save();

            const thePerson = await PersonModel.findOne({name: 'PersonBoolean2'});
            expect((thePerson as any).hasName).eq(true);
        });

    }
}