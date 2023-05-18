import {createGraphDBModel, DeleteType, GraphDBModelConstructor} from "../src";
import {expect} from "chai";

export function doubleSave(repository: any) {
  return async function () {
    let PhoneNumber: GraphDBModelConstructor, Address: GraphDBModelConstructor, Person: GraphDBModelConstructor,
      UserAccount: GraphDBModelConstructor;
    it('should create models', function () {
      PhoneNumber = createGraphDBModel({
        phoneNumber: {type: Number},
      }, {rdfTypes: [':PhoneNumber'], name: 'phoneNumber'});

      Address = createGraphDBModel({
        street: {type: String}
      }, {rdfTypes: [':Address'], name: 'address'})

      Person = createGraphDBModel({
        phoneNumber: {type: PhoneNumber, onDelete: DeleteType.CASCADE},
        addresses: {type: [Address], onDelete: DeleteType.CASCADE}
      }, {rdfTypes: [':Person'], name: 'person'});

      UserAccount = createGraphDBModel({
        person: {type: Person, onDelete: DeleteType.CASCADE}
      }, {rdfTypes: [':UserAccount'], name: 'userAccount'});
    });

    it('should not create duplicated nested instance', async function () {
      const userAccount = UserAccount({
        person: {
          phoneNumber: {phoneNumber: 123456789},
          addresses: [{street: 'street 1'}, {street: 'street 2'}]
        }
      });
      await userAccount.save();
      await userAccount.save();
      expect(await UserAccount.find({})).length(1);
      expect(await Person.find({})).length(1);
      expect(await Address.find({})).length(2);
      expect(await PhoneNumber.find({})).length(1);
    });
  }
}
