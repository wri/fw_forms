const config = require("config");
const logger = require("logger");
const path = require("path");
const convert = require("koa-convert");
const koa = require("koa");
const cors = require("@koa/cors");
const koaLogger = require("koa-logger");
const loader = require("loader");
const ErrorSerializer = require("serializers/errorSerializer");
const mongoose = require("mongoose");
const koaBody = require("koa-body")({
  multipart: true,
  formidable: {
    uploadDir: "/tmp",
    onFileBegin(name, file) {
      const folder = path.dirname(file.path);
      file.path = path.join(folder, file.name);
    }
  }
});
const loggedInUserService = require("./services/LoggedInUserService");
const Sentry = require("@sentry/node");

let dbSecret = config.get("mongodb.secret");
if (typeof dbSecret === "string") {
  dbSecret = JSON.parse(dbSecret);
}

const mongoURL =
  "mongodb://" +
  `${dbSecret.username}:${dbSecret.password}` +
  `@${config.get("mongodb.host")}:${config.get("mongodb.port")}` +
  `/${config.get("mongodb.database")}`;

mongoose.Promise = Promise;

const onDbReady = err => {
  if (err) {
    logger.error(err);
    throw new Error(err);
  }
};

mongoose.connect(mongoURL, onDbReady);

const app = koa();

/**
 * Sentry
 */
Sentry.init({
  dsn: "https://6eadede9d24343abbcaa82ba3712699d@o163691.ingest.sentry.io/6262402",
  environment: process.env.NODE_ENV
});

app.on("error", (err, ctx) => {
  Sentry.withScope(function (scope) {
    scope.addEventProcessor(function (event) {
      return Sentry.Handlers.parseRequest(event, ctx.request);
    });
    Sentry.captureException(err);
  });
});
/** */

app.use(convert.back(cors()));
app.use(koaLogger());
app.use(koaBody);

require("koa-validate")(app);

// catch errors and send in jsonapi standard. Always return vnd.api+json
app.use(function* handleErrors(next) {
  try {
    yield next;
  } catch (inErr) {
    let error = inErr;
    try {
      error = JSON.parse(inErr);
    } catch (e) {
      logger.debug("Could not parse error message - is it JSON?: ", inErr);
      error = inErr;
    }
    this.status = error.status || this.status || 500;
    if (this.status >= 500) {
      Sentry.captureException(error); // send error to sentry
      logger.error(error);
    } else {
      logger.info(error);
    }

    this.body = ErrorSerializer.serializeError(this.status, error.message);
    if (process.env.NODE_ENV === "production" && this.status === 500) {
      this.body = "Unexpected error";
    }
  }
  this.response.type = "application/vnd.api+json";
});

app.use(
  convert.back(async (ctx, next) => {
    await loggedInUserService.setLoggedInUser(ctx, logger);
    await next();
  })
);

// load routes
loader.loadRoutes(app);

// get port of environment, if not exist obtain of the config.
// In production environment, the port must be declared in environment variable
const port = config.get("service.port");

const server = app.listen(port, () => {});

logger.info(`Server started in port:${port}`);

module.exports = server;
