
import { MongoMemoryServer } from 'mongodb-memory-server';

async function start() {
  const mongo = await MongoMemoryServer.create({
    instance: {
      port: 27017,
      dbName: 'f2t'
    }
  });
  const uri = mongo.getUri();
  console.log(`Memory MongoDB started at: ${uri}`);
  console.log('You can now connect to it on port 27017');
}

start().catch(err => {
  console.error('Failed to start memory MongoDB:', err);
  process.exit(1);
});
