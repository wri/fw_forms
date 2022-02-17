const Router = require("koa-router");
const convert = require("koa-convert");
const koaSimpleHealthCheck = require("koa-simple-healthcheck");

const router = new Router({
  prefix: "/healthcheck"
});

router.get("/", convert.back(koaSimpleHealthCheck()));

module.exports = router;
