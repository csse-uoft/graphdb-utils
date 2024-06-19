import {createGraphDBModel, DeleteType, GraphDBModelConstructor, Transaction, SPARQL, GraphDB} from "../src";
import {expect} from "chai";

export function inference(repository: any) {
  return async function () {

    it('should insert triples', async function () {
      await GraphDB.sendUpdateQuery(`
        PREFIX ex: <http://example.com/>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        INSERT data {
          ex:Place a rdfs:Class .
          ex:BusStop a rdfs:Class .
          ex:BusStop rdfs:subClassOf ex:Place .
          
          ex:busstop a ex:BusStop .
        }
      `, repository)
    });

    it('should select without inference', async function () {
      const types: any[] = [];
      await GraphDB.sendSelectQuery(`
        PREFIX ex: <http://example.com/>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        select * where {
            ex:busstop a ?type.
        }
      `, false, ({type}) => {
        types.push(type);
      })
      expect(types).length(1);
    });

    it('should select with inference', async function () {
      const types: any[] = [];
      await GraphDB.sendSelectQuery(`
        PREFIX ex: <http://example.com/>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        select * where {
            ex:busstop a ?type.
        }
      `, true, ({type}) => {
        types.push(type);
      })
      expect(types).length(2);
    });

    it('should construct without inference', async function () {
      const types: any[] = [];
      await GraphDB.sendConstructQuery(`
        PREFIX ex: <http://example.com/>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        construct where {
            ex:busstop a ?type.
        }
      `, ({subject, predicate, object}) => {
        types.push(object);
      })
      expect(types).length(1);
    });

    it('should construct with inference', async function () {
      const types: any[] = [];
      await GraphDB.sendConstructQuery(`
        PREFIX ex: <http://example.com/>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        construct where {
            ex:busstop a ?type.
        }
      `, ({subject, predicate, object}) => {
        types.push(object);
      }, true)
      expect(types).length(2);
    });

    it('should construct without inference in transaction', async function () {
      await Transaction.beginTransaction();

      const types: any[] = [];
      await GraphDB.sendConstructQuery(`
        PREFIX ex: <http://example.com/>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        construct where {
            ex:busstop a ?type.
        }
      `, ({subject, predicate, object}) => {
        types.push(object);
      }, false, Transaction.client)
      await Transaction.rollback();
      console.log(types)
      expect(types).length(1);
    });
  }
}
