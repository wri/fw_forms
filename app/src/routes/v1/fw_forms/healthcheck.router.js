const Router = require("koa-router");
const convert = require("koa-convert");
const koaSimpleHealthCheck = require("koa-simple-healthcheck");

const router = new Router({
  prefix: "/healthcheck"
});

router.get("/", convert.back(koaSimpleHealthCheck()));
router.get("/fail", ctx => {
  ctx.status = 500;
  throw new Error("Test Fail");
});

module.exports = router;
