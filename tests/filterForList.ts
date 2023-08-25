import {createGraphDBModel, DeleteType, GraphDBModelConstructor} from "../src";
import {expect} from "chai";

export function filterForList(repository: any) {
  return async function () {
    let  GDBThemeModel: GraphDBModelConstructor, GDBStakeholerModel: GraphDBModelConstructor, GDBUserAccountModel: GraphDBModelConstructor,
      GDBOrganizationIdModel: GraphDBModelConstructor, GDBIndicatorModel: GraphDBModelConstructor, GDBOutcomeModel: GraphDBModelConstructor,
      GDBPhoneNumberModel: GraphDBModelConstructor;

    it('should create models', function () {
      GDBThemeModel = createGraphDBModel({
        name: {type: String, internalKey: 'cids:hasName'},
      }, {
        rdfTypes: ['cids:Theme'], name: 'theme'
      });

      GDBOutcomeModel = createGraphDBModel({
        name: {type: String, internalKey: 'cids:hasName'},
        themes: {type: [GDBThemeModel], internalKey: 'cids:forTheme'},
      },{
        rdfTypes: ['cids:Outcome'], name: 'outcome'
      })
    })

    it('the outcome should not be fetched', async function () {

      const outcome = GDBOutcomeModel({
        name: "Test",
        themes: []
      });
      await outcome.save();

      const outcomes = await GDBOutcomeModel.find({theme: 'http://theme'});
      expect(outcomes).length(0);

    });
  }
}
