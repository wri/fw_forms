const Router = require("koa-router");
const logger = require("logger");
const AnswersSerializer = require("serializers/answersSerializer");
const AnswersService = require("services/answersService");
const TeamService = require("services/teamService");
const ReportsModel = require("models/reportsModel");
const { ObjectId } = require("mongoose").Types;
const config = require("config");
const convert = require("koa-convert");

const router = new Router({
  prefix: "/reports/:reportId/answers"
});

class AnswersRouter {
  static *getArea() {
    logger.info(`Obtaining answers for report ${this.params.reportId} for area ${this.params.areaId}`);

    const template = yield ReportsModel.findOne({ _id: this.params.reportId });

    const answers = yield AnswersService.filterAnswersByArea({
      template,
      reportId: this.params.reportId,
      loggedUser: this.state.loggedUser,
      team: this.state.team,
      query: this.state.query,
      areaId: this.params.areaId
    });

    if (!answers) {
      this.throw(404, "Answers not found with these permissions");
      return;
    }
    this.body = AnswersSerializer.serialize(answers);
  }
}

function* loggedUserToState(next) {
  if (this.query && this.query.loggedUser) {
    this.state.loggedUser = JSON.parse(this.query.loggedUser);
    delete this.query.loggedUser;
  } else if (
    this.request.body &&
    (this.request.body.loggedUser || (this.request.body.fields && this.request.body.fields.loggedUser))
  ) {
    if (this.request.body.loggedUser) {
      this.state.loggedUser = this.request.body.loggedUser;
      delete this.request.body.loggedUser;
    } else if (this.request.body.fields && this.request.body.fields.loggedUser) {
      this.state.loggedUser = JSON.parse(this.request.body.fields.loggedUser);
      delete this.request.body.fields.loggedUser;
    }
  } else {
    this.throw(401, "Unauthorized");
    return;
  }
  yield next;
}

function* queryToState(next) {
  if (this.request.query && Object.keys(this.request.query).length > 0) {
    this.state.query = this.request.query;
  }
  yield next;
}

function* reportPermissions(next) {
  const team = yield TeamService.getTeam(this.state.loggedUser.id);
  let filters = {};
  if (team.data && team.data.attributes) {
    this.state.team = team.data.attributes;
    const manager = team.data.attributes.managers[0].id
      ? team.data.attributes.managers[0].id
      : team.data.attributes.managers[0];
    filters = {
      $and: [
        { _id: new ObjectId(this.params.reportId) },
        {
          $or: [{ public: true }, { user: new ObjectId(this.state.loggedUser.id) }, { user: manager }]
        }
      ]
    };
  } else {
    filters = {
      $and: [
        { _id: new ObjectId(this.params.reportId) },
        {
          $or: [{ public: true }, { user: new ObjectId(this.state.loggedUser.id) }]
        }
      ]
    };
  }

  const report = yield ReportsModel.findOne(filters).populate("questions");
  if (!report) {
    this.throw(404, "Report not found");
    return;
  }
  this.state.report = report;
  yield next;
}

function* mapTemplateParamToId(next) {
  if (this.params.reportId === config.get("legacyTemplateId") || this.params.reportId === "default") {
    this.params.reportId = config.get("defaultTemplateId");
  }
  yield next;
}

router.get(
  "/area/:areaId",
  convert(mapTemplateParamToId),
  convert(loggedUserToState),
  convert(reportPermissions),
  convert(queryToState),
  convert(AnswersRouter.getArea)
);

module.exports = router;
