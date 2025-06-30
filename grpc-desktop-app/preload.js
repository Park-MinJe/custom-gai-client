const { contextBridge } = require('electron');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const packageDefinition = protoLoader.loadSync('./backend/langgraph.proto');
const proto = grpc.loadPackageDefinition(packageDefinition).langgraph;

const client = new proto.LangGraphService('localhost:50051', grpc.credentials.createInsecure());

contextBridge.exposeInMainWorld('api', {
  runGraph: (input) =>
    new Promise((resolve, reject) => {
      client.RunGraph({ user_input: input }, (err, res) => {
        if (err) reject(err);
        else resolve(res.result);
      });
    }),
});
