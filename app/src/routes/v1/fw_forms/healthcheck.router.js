const Router = require("koa-router");
const koaSimpleHealthCheck = require("koa-simple-healthcheck");
const mongoose = require("mongoose");
const logger = require("logger");

const router = new Router({
  prefix: "/healthcheck"
});

router.get(
  "/",
  koaSimpleHealthCheck({
    test: function () {
      if (mongoose.connection.readyState !== 1) {
        const error = new Error("Not connected to the database");
        logger.error(error);
        return { error: error.message };
      }
    }
  })
);

module.exports = router;
