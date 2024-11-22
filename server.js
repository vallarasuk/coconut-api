const config = require("./lib/config");
const restify = require("restify");
let fs = require("fs");
const db = require("./db");
const routes = require("./routes");
const corsMiddleware = require("restify-cors-middleware");
const Https = require("./helpers/Https");

let server;

if (config.port == Https.PORT) {
  const options = {
    cert: fs.readFileSync(config.sslCertificate),
    key: fs.readFileSync(config.sslKey),
  };

  // const options2 = {
  //   cert: fs.readFileSync('/etc/letsencrypt/live/portal-api.thidiff.com/fullchain.pem'),
  //   key: fs.readFileSync( '/etc/letsencrypt/live/portal-api.thidiff.com/privkey.pem')
  // };

  // const options3 = {
  //   cert: fs.readFileSync('/etc/letsencrypt/live/portal-api.zunomart.com/fullchain.pem'),
  //   key: fs.readFileSync( '/etc/letsencrypt/live/portal-api.zunomart.com/privkey.pem')
  // };

  server = restify.createServer(options, {
    name: "coconut-api",
  });

  // server.addContext('portal-api.thidiff.com', options2);
  // server.addContext('portal-api.zunomart.com', options3);
} else {
  server = restify.createServer({
    name: "coconut-api",
  });
}

server.use(restify.plugins.gzipResponse());
server.use(
  restify.plugins.bodyParser({
    multiples: true,
  })
);
server.use(restify.plugins.queryParser());

server.use((req, res, next) => {
  if ((req.method === "PUT" || req.method === "POST") && !req.body) {
    req.body = {};
  }
  next();
});

const cors = corsMiddleware({
  preflightMaxAge: 5, //Optional
  origins: config.corsUrl,
  credentials: false,
  allowHeaders: ["authorization", "API-Token"],
});

server.pre(cors.preflight);
server.use(cors.actual);

server.on("MethodNotAllowed", (req, res) => {
  if (req.method.toUpperCase() === "OPTIONS") {
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept"
    );
    res.header("Access-Control-Allow-Methods", "DELETE, GET, POST, PUT");
    res.send(204);
  } else {
    res.send({ message: "methodNotAllowed" });
  }
});

db.connect((err) => {
  if (err) {
    console.log(err, "Unable to connect to the database");
    server.close();
  }
  server.db = db;

  routes(server);

  server.listen(config.port, () => {
    console.log(
      `coconut API Service listening on port ${config.port} in ${config.environment} mode`
    );
  });
});

process.on("SIGTERM", () => {
  gracefulShutdown((err) => {
    console.log("Shutting the coconut API Service down...");
    server.close();
    process.exit(err ? 1 : 0);
  });
});

process.on("uncaughtException", (err) => {
  console.error(err && err.stack);
  // process.exit(1);
});
