const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const redis = require('@redis/client');

var PROTO_PATH = __dirname + '/proto/vote.proto';
const SERVER_PORT = 50001;
const CAT = 'cat';
const DOG = 'dog';

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const vote = grpc.loadPackageDefinition(packageDefinition).vote;

const grpcServer = new grpc.Server();

const redisClient = redis.createClient({
    socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT
    }
});

grpcServer.addService(vote.VoteService.service, {
  GetVote: GetVote,
  Vote: Vote,
  Reset: Reset
});

async function GetVote(call, callback) {
  var result = await redisClient.mGet([CAT, DOG])
  if ((result[0] == null) || (result[1] == null)) {
    if (await redisClient.mSet([CAT, '0', DOG, '0']) == 'OK') {
      result = ['0', '0'];
    }
  }

  callback(null, {items: [{name: CAT, ticket: Number(result[0])}, {name: DOG, ticket: Number(result[1])}]});
}

async function Vote(call, callback) {
  var result;

  if ((call.request.name == CAT) || (call.request.name == DOG)) {
    await redisClient.incr(call.request.name);
    result = await redisClient.get(call.request.name);
  } else {
    call.request.name = "invalid";
    result = '0';
  }
  
  callback(null, { item: {name: call.request.name, ticket: Number(result)} });
}

async function Reset(call, callback) {
  var result = await redisClient.flushAll();
  callback(null, {status: result == 'OK' ? true : false});
}

async function redisConnect() {
  await redisClient.connect();
  console.log("Connected to Redis server");
}

redisConnect();

grpcServer.bindAsync('0.0.0.0'.concat(':').concat(SERVER_PORT), grpc.ServerCredentials.createInsecure(), (error, port) => {
  if (!error) {
    console.log("gRPC Server started on port", port);
    grpcServer.start();
  } else {
    console.log("gRPC Server bind failed");
  }
});
