const Router = require("koa-router");
const logger = require("logger");
const AnswersSerializer = require("serializers/answersSerializer");
const V3AnswersService = require("services/v3Answer.service");
const ReportsModel = require("models/reportsModel");
const AnswersModel = require("../../models/answersModel");
const { ObjectId } = require("mongoose").Types;
const config = require("config");
const convert = require("koa-convert");
const AreaService = require("services/area.service");
const V3TeamService = require("services/v3Team.service");

const router = new Router({
  prefix: "/reports/:reportId/answers"
});

class AnswersRouter {
  static *getArea() {
    logger.info(`Obtaining answers for report ${this.params.reportId} for area ${this.params.areaId}`);

    // get report template
    //const template = yield ReportsModel.findOne({ _id: this.params.reportId });
    // get teams the user is part of
    //const userTeams = yield V3TeamService.getUserTeams(this.state.loggedUser.id);

    /* const answers = yield V3AnswersService.filterAnswersByArea({
      template,
      reportId: this.params.reportId,
      loggedUser: this.state.loggedUser,
      teams: this.state.userTeams,
      query: this.state.query,
      areaId: this.params.areaId
    }); */

    let restricted = false;
    if(this.state.query && this.state.query.restricted === "true") restricted = true;

    const answers = yield V3AnswersService.filterAnswersByArea({
      reportId: this.params.reportId,
      teams: this.state.userTeams,
      areaId: this.params.areaId,
      loggedUser: this.state.loggedUser,
      restricted
    });

    if (!answers) {
      this.throw(404, "Answers not found with these permissions");
      return;
    }
    this.body = AnswersSerializer.serialize(answers);
  }

  static *delete() {
    logger.info(`Deleting answer with id ${this.params.id}`);
    // only the answer creator OR a manager for the area can delete the answer
    let permitted = false;
    // get the answer
    const answer = yield AnswersModel.findById(this.params.id);
    if (answer.user.toString() === this.state.loggedUser.id.toString()) permitted = true;
    else {
      // get associated teams of answer area
      const areaTeams = yield AreaService.getAreaTeams(answer.areaOfInterest);
      // get teams the user is part of
      const userTeams = yield V3TeamService.getUserTeams(this.state.loggedUser.id);
      // create array user is manager of
      const managerTeams = [];
      userTeams.forEach(userTeam => {
        if (userTeam.attributes.userRole === "manager" || userTeam.attributes.userRole === "administrator")
          managerTeams.push(userTeam.id.toString());
      });
      // create an array of teams in which the team is associated with the area AND the user is a manager of
      const managerArray = areaTeams.filter(areaTeamId => managerTeams.includes(areaTeamId.toString()));
      if (managerArray.length > 0) permitted = true;
    }

    if (!permitted) {
      this.throw(401, "You are not authorised to delete this record");
      return;
    }

    const result = yield AnswersModel.findByIdAndRemove(this.params.id);
    if (!result || !result._id) {
      this.throw(404, "Answer not found");
      return;
    }
    this.body = "";
    this.status = 204;
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
  // creates a filter to get the report if the user is allowed to see it
  // looks like a monitor can see reports made by their team manager(s)
  // get the users teams
  const teams = yield V3TeamService.getUserTeams(this.state.loggedUser.id);
  this.state.userTeams = teams;
  // get managers of those teams
  const managers = [];
  for (const team of teams) {
    let teamUsers = yield V3TeamService.getTeamUsers(team.id);
    if (!teamUsers) teamUsers = [];
    let teamManagers = teamUsers.filter(
      teamUser => teamUser.attributes.role === "manager" || teamUser.attributes.role === "administrator"
    );
    teamManagers.forEach(manager => managers.push({ user: new ObjectId(manager.attributes.userId) }));
  }
  let filters = {};
  if (teams.length > 0) {
    filters = {
      $and: [
        { _id: new ObjectId(this.params.reportId) },
        {
          $or: [{ public: true }, { user: new ObjectId(this.state.loggedUser.id) }, ...managers]
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

router.delete("/:id", convert(mapTemplateParamToId), convert(loggedUserToState), convert(AnswersRouter.delete));

module.exports = router;
