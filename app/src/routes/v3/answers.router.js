const Router = require("koa-router");
const logger = require("logger");
const AnswersSerializer = require("serializers/answersSerializer");
const V3AnswersService = require("services/v3Answer.service");
const ReportsModel = require("models/reportsModel");
const AnswersModel = require("../../models/answersModel");
const { ObjectId } = require("mongoose").Types;
const config = require("config");
const AreaService = require("services/area.service");
const V3TeamService = require("services/v3Team.service");
const s3Service = require("services/s3Service");
const AnswersService = require("services/answer.service");

const router = new Router({
  prefix: "/reports/:reportId/answers"
});

class AnswersRouter {
  static async getArea(ctx) {
    logger.info(`Obtaining answers for report ${ctx.params.reportId} for area ${ctx.params.areaId}`);

    // get report template
    //const template = await ReportsModel.findOne({ _id: ctx.params.reportId });
    // get teams the user is part of
    //const userTeams = await V3TeamService.getUserTeams(ctx.state.loggedUser.id);

    /* const answers = await V3AnswersService.filterAnswersByArea({
      template,
      reportId: ctx.params.reportId,
      loggedUser: ctx.state.loggedUser,
      teams: ctx.state.userTeams,
      query: ctx.state.query,
      areaId: ctx.params.areaId
    }); */

    let restricted = false;
    if (ctx.state.query && ctx.state.query.restricted === "true") restricted = true;

    const answers = await V3AnswersService.filterAnswersByArea({
      reportId: ctx.params.reportId,
      teams: ctx.state.userTeams,
      areaId: ctx.params.areaId,
      loggedUser: ctx.state.loggedUser,
      restricted
    });

    if (!answers) {
      ctx.throw(404, "Answers not found with these permissions");
      return;
    }
    ctx.body = AnswersSerializer.serialize(answers);
  }

  static async getAll(ctx) {
    logger.info(`Obtaining answers for report ${ctx.params.reportId}`);

    const template = await ReportsModel.findOne({ _id: ctx.params.reportId });

    const answers = await AnswersService.getAllTemplateAnswers({
      template,
      reportId: ctx.params.reportId,
      loggedUser: ctx.state.loggedUser,
      team: ctx.state.team,
      query: ctx.state.query
    });

    if (!answers) {
      ctx.throw(404, "Answers not found with these permissions");
      return;
    }
    ctx.body = AnswersSerializer.serialize(answers);
  }

  static async get(ctx) {
    logger.info(`Obtaining answer ${ctx.params.id} for report ${ctx.params.reportId}`);
    let filter = {};

    const template = await ReportsModel.findOne({ _id: ctx.params.reportId });

    let confirmedUsers = [];
    // get user teams
    const teams = await V3TeamService.getUserTeams(ctx.state.loggedUser.id);
    if (teams.length > 0) {
      for await (const team of teams) {
        // get users of each team and add to users array
        const users = await V3TeamService.getTeamUsers(team.id);
        confirmedUsers.push(...users.map(user => new ObjectId(user.attributes.userId)));
      }
    }
    // add current user to users array
    confirmedUsers.push(new ObjectId(ctx.state.loggedUser.id));

    if (ctx.state.loggedUser.role === "ADMIN" || ctx.state.loggedUser.id === template.user) {
      filter = {
        _id: new ObjectId(ctx.params.id),
        report: new ObjectId(ctx.params.reportId)
      };
    } else {
      filter = {
        user: { $in: confirmedUsers },
        _id: new ObjectId(ctx.params.id),
        report: new ObjectId(ctx.params.reportId)
      };
    }
    const answer = await AnswersModel.find(filter);
    if (!answer) {
      ctx.throw(404, "Answer not found with these permissions");
      return;
    }
    ctx.body = AnswersSerializer.serialize(answer);
  }

  static async save(ctx) {
    logger.info("Saving answer");
    logger.debug(ctx.request.body);

    const fields = ctx.request.body;
    let userPosition = [];

    try {
      userPosition = fields.userPosition ? fields.userPosition.split(",") : [];
    } catch (e) {
      ctx.throw(400, `Position values must be separated by ','`, e);
    }

    const answer = {
      report: ctx.params.reportId,
      reportName: fields.reportName,
      username: fields.username,
      organization: fields.organization,
      teamId: fields.teamId,
      areaOfInterest: fields.areaOfInterest,
      areaOfInterestName: fields.areaOfInterestName,
      language: fields.language,
      userPosition,
      clickedPosition: JSON.parse(fields.clickedPosition),
      startDate: fields.startDate,
      endDate: fields.endDate,
      layer: fields.layer,
      user: new ObjectId(ctx.state.loggedUser.id),
      createdAt: fields.date,
      responses: []
    };

    const pushResponse = (question, response) => {
      answer.responses.push({
        name: question.name,
        value: typeof response !== "undefined" ? response : null
      });
    };

    const pushError = question => {
      ctx.throw(400, `${question.label[answer.language]} (${question.name}) required`);
    };
    const { questions } = ctx.state.report;

    if (!questions || (questions && !questions.length)) {
      ctx.throw(400, `No question associated with this report`);
    }

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];

      // handle parent questions
      const bodyAnswer = ctx.request.body[question.name];
      const fileAnswer = ctx.request.files[question.name];
      let response = typeof bodyAnswer !== "undefined" ? bodyAnswer : fileAnswer;
      if (!response && question.required) {
        pushError(question);
      }
      if (response && response.path && response.name && question.type === "blob") {
        // upload file
        response = await s3Service.uploadFile(response.path, response.name);
      }

      pushResponse(question, response);

      // handle child questions
      if (question.childQuestions) {
        for (let j = 0; j < question.childQuestions.length; j++) {
          const childQuestion = question.childQuestions[j];
          const childBodyAnswer = ctx.request.body[childQuestion.name];
          const childFileAnswer = ctx.request.files[childQuestion.name];
          const conditionMatches = typeof bodyAnswer !== "undefined" && childQuestion.conditionalValue === bodyAnswer;
          let childResponse = typeof childBodyAnswer !== "undefined" ? childBodyAnswer : childFileAnswer;
          if (!childResponse && childQuestion.required && conditionMatches) {
            pushError(childQuestion);
          }
          if (childResponse && question.type === "blob") {
            // upload file
            childResponse = await s3Service.uploadFile(response.path, response.name);
          }
          pushResponse(childQuestion, childResponse);
        }
      }
    }

    const answerModel = await new AnswersModel(answer).save();

    ctx.body = AnswersSerializer.serialize(answerModel);
  }

  static async delete(ctx) {
    logger.info(`Deleting answer with id ${ctx.params.id}`);
    // only the answer creator OR a manager for the area can delete the answer
    let permitted = false;
    // get the answer
    const answer = await AnswersModel.findById(ctx.params.id);
    if (answer.user.toString() === ctx.state.loggedUser.id.toString()) permitted = true;
    else {
      // get associated teams of answer area
      const areaTeams = await AreaService.getAreaTeams(answer.areaOfInterest);
      // get teams the user is part of
      const userTeams = await V3TeamService.getUserTeams(ctx.state.loggedUser.id);
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
      ctx.throw(401, "You are not authorised to delete this record");
      return;
    }

    const result = await AnswersModel.findByIdAndRemove(ctx.params.id);
    if (!result || !result._id) {
      ctx.throw(404, "Answer not found");
      return;
    }
    ctx.body = "";
    ctx.status = 204;
  }
}

async function loggedUserToState(ctx, next) {
  if (ctx.query && ctx.query.loggedUser) {
    ctx.state.loggedUser = JSON.parse(ctx.query.loggedUser);
    delete ctx.query.loggedUser;
  } else if (
    ctx.request.body &&
    (ctx.request.body.loggedUser || (ctx.request.body.fields && ctx.request.body.fields.loggedUser))
  ) {
    if (ctx.request.body.loggedUser) {
      ctx.state.loggedUser = ctx.request.body.loggedUser;
      delete ctx.request.body.loggedUser;
    } else if (ctx.request.body.fields && ctx.request.body.fields.loggedUser) {
      ctx.state.loggedUser = JSON.parse(ctx.request.body.fields.loggedUser);
      delete ctx.request.body.fields.loggedUser;
    }
  } else {
    ctx.throw(401, "Unauthorized");
    return;
  }
  await next();
}

async function queryToState(ctx, next) {
  if (ctx.request.query && Object.keys(ctx.request.query).length > 0) {
    ctx.state.query = ctx.request.query;
  }
  await next();
}

async function reportPermissions(ctx, next) {
  // creates a filter to get the report if the user is allowed to see it
  // looks like a monitor can see reports made by their team manager(s)
  // get the users teams
  const teams = await V3TeamService.getUserTeams(ctx.state.loggedUser.id);
  ctx.state.userTeams = teams;
  // get managers of those teams
  const managers = [];
  for (const team of teams) {
    let teamUsers = await V3TeamService.getTeamUsers(team.id);
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
        { _id: new ObjectId(ctx.params.reportId) },
        {
          $or: [{ public: true }, { user: new ObjectId(ctx.state.loggedUser.id) }, ...managers]
        }
      ]
    };
  } else {
    filters = {
      $and: [
        { _id: new ObjectId(ctx.params.reportId) },
        {
          $or: [{ public: true }, { user: new ObjectId(ctx.state.loggedUser.id) }]
        }
      ]
    };
  }

  const report = await ReportsModel.findOne(filters).populate("questions");
  if (!report) {
    ctx.throw(404, "Report not found");
    return;
  }
  ctx.state.report = report;
  await next();
}

async function mapTemplateParamToId(ctx, next) {
  if (ctx.params.reportId === config.get("legacyTemplateId") || ctx.params.reportId === "default") {
    ctx.params.reportId = config.get("defaultTemplateId");
  }
  await next();
}

router.post("/", mapTemplateParamToId, loggedUserToState, reportPermissions, AnswersRouter.save);
router.get(
  "/area/:areaId",
  mapTemplateParamToId,
  loggedUserToState,
  reportPermissions,
  queryToState,
  AnswersRouter.getArea
);
router.get("/", mapTemplateParamToId, loggedUserToState, reportPermissions, queryToState, AnswersRouter.getAll);
router.get("/:id", mapTemplateParamToId, loggedUserToState, queryToState, AnswersRouter.get);
router.delete("/:id", mapTemplateParamToId, loggedUserToState, AnswersRouter.delete);

module.exports = router;
