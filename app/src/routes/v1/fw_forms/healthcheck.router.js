const Router = require("koa-router");
const koaSimpleHealthCheck = require("koa-simple-healthcheck");
const mongoose = require("mongoose");

const router = new Router({
  prefix: "/healthcheck"
});

router.get(
  "/",
  koaSimpleHealthCheck({
    test: function () {
      if (mongoose.connection.readyState !== 1) throw new Error("Not connected to database");
    }
  })
);

module.exports = router;
