import {Transaction} from "../transaction";
import process from 'node:process';

async function cleanupTransaction() {
  if (Transaction.client) {
    console.log('graphdb-utils: Cleaning up GraphDB Transaction...')
    await Transaction.rollback();
  }
}

process.on('exit', cleanupTransaction);
process.on('SIGINT', cleanupTransaction);
