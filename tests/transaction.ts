import {createGraphDBModel, DeleteType, GraphDBModelConstructor, Transaction, TransactionIsolationLevel} from "../src";
import {expect} from "chai";

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

      persons[0].name = 'hello2';
      persons[0].save();
      const persons4 = await PersonModel.find({name: 'hello2'});
      expect(persons4).length(1);


      const persons3 = await PersonModel.find({}, {ignoreTransaction: true});
      expect(persons3).length(0);

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
