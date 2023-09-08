import {createGraphDBModel, DeleteType, GraphDBModelConstructor, Transaction, TransactionIsolationLevel} from "../src";
import {expect} from "chai";
import {sleep} from "../src/utils";

export function transaction(repository: any) {
  return async function () {
    let PersonModel: GraphDBModelConstructor;

    it('should create models', function () {
      PersonModel = createGraphDBModel({
        name: {type: String, internalKey: 'cids:hasName'},
      }, {
        rdfTypes: [':PersonTest'], name: 'personTest'
      });
    });
    it('should commit', async function () {
      await Transaction.beginTransaction();
      const person = PersonModel({
        name: "hello"
      });
      await person.save();
      const persons = await PersonModel.find({});
      expect(persons).length(1);

      await Transaction.commit();

      const persons2 = await PersonModel.find({});
      expect(persons2).length(1);
    });

    it('should rollback', async function () {
      await PersonModel.findAndDelete({});
      await Transaction.beginTransaction();
      const person = PersonModel({
        name: "hello"
      });
      await person.save();
      const persons = await PersonModel.find({});
      expect(persons).length(1);

      await Transaction.rollback();

      const persons2 = await PersonModel.find({});
      expect(persons2).length(0);
    });
  }
}
