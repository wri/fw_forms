const Router = require("koa-router");
const koaSimpleHealthCheck = require("koa-simple-healthcheck");

const router = new Router({
  prefix: "/healthcheck"
});

router.get("/", koaSimpleHealthCheck());

module.exports = router;
