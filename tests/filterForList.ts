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

    it('should fetch nested instance by uri', async function () {

      const outcome = GDBOutcomeModel({
        name: "Test",
        themes: [{
          _uri: 'http://theme'
        }]
      });
      await outcome.save();

      const outcomes = await GDBOutcomeModel.find({themes: {_uri: 'http://theme'}});
      expect(outcomes).length(1);
      const outcomes2 = await GDBOutcomeModel.find({themes: {_uri: 'http://theme2'}});
      expect(outcomes2).length(0);
    });
  }
}
