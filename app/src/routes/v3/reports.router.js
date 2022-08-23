const Router = require("koa-router");
const logger = require("logger");
const ReportsSerializer = require("serializers/reportsSerializer");
const ReportsModel = require("models/reportsModel");
const ReportsValidator = require("validators/v3reportsValidator");
const AnswersModel = require("models/answersModel");
const AnswersService = require("services/answer.service");
const V3AnswersService = require("services/v3Answer.service");
const TeamService = require("services/team.service");
const passThrough = require("stream").PassThrough;
const { ObjectId } = require("mongoose").Types;
const config = require("config");
const CSV = require("services/csv.service");
const AreaService = require("services/area.service");
const V3TeamService = require("services/v3Team.service");
const AnswersSerializer = require("serializers/answersSerializer");

const router = new Router({
  prefix: "/reports"
});

class ReportsRouter {
  static async getAll(ctx) {
    logger.info("Obtaining all reports");
    const filter = {
      $and: [
        {
          $or: [{ $and: [{ public: true }, { status: "published" }] }, { user: new ObjectId(ctx.state.loggedUser.id) }]
        }
      ]
    };
    if (ctx.state.query) {
      Object.keys(ctx.state.query).forEach(key => {
        filter.$and.push({ [key]: ctx.state.query[key] });
      });
    }
    const reports = await ReportsModel.find(filter);

    // get answer count for each report
    const numReports = reports.length;
    for (let i = 1; i < numReports; i++) {
      let answersFilter = {};
      if (ctx.state.loggedUser.role === "ADMIN" || ctx.state.loggedUser.id === reports[i].user) {
        answersFilter = {
          report: new ObjectId(reports[i].id)
        };
      } else {
        answersFilter = {
          user: new ObjectId(ctx.state.loggedUser.id),
          report: new ObjectId(reports[i].id)
        };
      }
      const answers = await AnswersModel.count(answersFilter);
      logger.info(answers);
      reports[i].answersCount = answers || 0;
    }

    ctx.body = ReportsSerializer.serialize(reports);
  }

  static async getAllAnswers(ctx) {
    logger.info(`Obtaining all answers`);

    // get teams the user is part of
    const userTeams = await V3TeamService.getUserTeams(ctx.state.loggedUser.id);

    const answers = await V3AnswersService.getAllAnswers({
      loggedUser: ctx.state.loggedUser,
      teams: userTeams
    });

    for await (const answer of answers) {
      const template = await ReportsModel.findOne({ _id: answer.report });
      answer.templateName = template.name[answer.language];
      logger.info(template.name)
    }

    if (!answers) {
      ctx.throw(404, "Answers not found for this user");
      return;
    }
    logger.info(answers)
    ctx.body = AnswersSerializer.serialize(answers);
  }

  static async deleteAllAnswers(ctx) {
    logger.info(`Deleting all answers`);

    await V3AnswersService.deleteAllAnswers({
      loggedUser: ctx.state.loggedUser
    });

    ctx.body = null;
    ctx.statusCode = 204;
  }

  static async get(ctx) {
    logger.info(`Obtaining reports with id ${ctx.params.id}`);
    const report = await ReportsModel.findOne({ _id: ctx.params.id });
    if (!report) {
      ctx.throw(404, "Report not found");
      return;
    }

    // get answers count for the report
    let answersFilter = {};
    if (ctx.state.loggedUser.role === "ADMIN" || ctx.state.loggedUser.id === report.user) {
      answersFilter = {
        report: new ObjectId(ctx.params.id)
      };
    } else {
      answersFilter = {
        user: new ObjectId(ctx.state.loggedUser.id),
        report: new ObjectId(ctx.params.id)
      };
    }
    const answers = await AnswersModel.count(answersFilter);
    report.answersCount = answers;

    ctx.body = ReportsSerializer.serialize(report);
  }

  static async save(ctx) {
    logger.info("Saving reports", ctx.request.body);
    const request = ctx.request.body;

    if (request.public && ctx.state.loggedUser.role !== "ADMIN") {
      ctx.throw(403, "Admin permissions required to save public templates");
      return;
    }

    const report = await new ReportsModel({
      name: request.name,
      user: ctx.state.loggedUser.id,
      languages: request.languages,
      defaultLanguage: request.defaultLanguage,
      questions: request.questions,
      public: request.public,
      status: request.status
    }).save();

    ctx.body = ReportsSerializer.serialize(report);
  }

  static async put(ctx) {
    logger.info("Updating report", ctx.request.body);
    const { body } = ctx.request;

    if (ctx.state.loggedUser.role !== "ADMIN") {
      ctx.throw(403, "Only admins can update reports.");
      return;
    }

    const report = await ReportsModel.findOne({
      _id: new ObjectId(ctx.params.id)
    });

    if (!report) {
      ctx.throw(404, "Report not found with these permissions");
      return;
    }

    Object.assign(report, body);

    // add answers count to return and updated date
    const answers = await AnswersModel.count({
      report: new ObjectId(ctx.params.id)
    });
    report.answersCount = answers;
    report.updatedDate = Date.now;

    await report.save();
    ctx.body = ReportsSerializer.serialize(report);
  }

  static async patch(ctx) {
    logger.info(`Updating template with id ${ctx.params.id}...`);

    const reportFilter = {
      $and: [{ _id: new ObjectId(ctx.params.id) }]
    };
    if (ctx.state.loggedUser.role !== "ADMIN") {
      reportFilter.$and.push({ user: new ObjectId(ctx.state.loggedUser.id) });
    }
    const report = await ReportsModel.findOne(reportFilter);
    const request = ctx.request.body;

    // if user did not create then return error
    if (!report) {
      ctx.throw(404, "Report not found.");
      return;
    }

    // props allow to change even with answers
    if (request.name) {
      report.name = request.name;
    }

    if (request.status) {
      report.status = request.status;
    }

    if (request.languages) {
      report.languages = request.languages;
    }

    // if user is an admin, they can make the report public
    if (ctx.state.loggedUser.role === "ADMIN" && request.public) {
      report.public = request.public;
    }

    // add answers count to return and updated date
    const answers = await AnswersModel.count({
      report: new ObjectId(ctx.params.id)
    });
    report.answersCount = answers;
    report.updatedDate = Date.now;

    await report.save();
    ctx.body = ReportsSerializer.serialize(report);
  }

  static async delete(ctx) {
    const { role } = ctx.state.loggedUser;
    logger.info(`Checking report for answers...`);
    const answers = await AnswersModel.count({
      report: new ObjectId(ctx.params.id)
    });
    if (answers > 0 && role !== "ADMIN") {
      ctx.throw(403, "This report has answers, you cannot delete. Please unpublish instead.");
      return;
    }
    logger.info(`Report has no answers.`);
    logger.info(`Deleting report with id ${ctx.params.id}...`);

    // remove all area - template relations
    await AreaService.deleteTemplateAreaRelations(ctx.params.id);

    // finally remove template
    const query = {
      $and: [{ _id: new ObjectId(ctx.params.id) }]
    };
    if (role !== "ADMIN") {
      query.$and.push({ user: new ObjectId(ctx.state.loggedUser.id) });
      //query.$and.push({ status: ["draft", "unpublished"] });
    } else if (answers > 0) {
      logger.info("User is admin, removing report answers...");
      await AnswersModel.remove({ report: new ObjectId(ctx.params.id) });
    }
    const result = await ReportsModel.remove(query);

    if (!result || !result.result || result.result.ok === 0) {
      ctx.throw(404, "Report not found with these permissions. You must be the owner to remove.");
      return;
    }
    ctx.statusCode = 204;
  }

  static async downloadAnswers(ctx) {
    logger.info(`Downloading answers for report ${ctx.params.id}`);
    ctx.set("Content-disposition", `attachment; filename=${ctx.params.id}.csv`);
    ctx.set("Content-type", "text/csv");
    ctx.body = passThrough();

    let report = await ReportsModel.findOne({
      $and: [
        { _id: new ObjectId(ctx.params.id) },
        {
          $or: [{ public: true }, { user: new ObjectId(ctx.state.loggedUser.id) }]
        }
      ]
    });
    if (!report) {
      ctx.throw(404, "Report not found");
      return;
    }

    report = report.toObject();

    const questionLabels = report.questions.reduce(
      (acc, question) => ({
        ...acc,
        [question.name]: question.label[report.defaultLanguage],
        ...question.childQuestions.reduce(
          (acc2, childQuestion) => ({
            ...acc2,
            [childQuestion.name]: childQuestion.label[report.defaultLanguage]
          }),
          {}
        )
      }),
      {
        userId: "User",
        reportName: "Name",
        areaOfInterest: "Area of Interest",
        areaOfInterestName: "Area of Interest name",
        clickedPositionLat: "Position of report lat",
        clickedPositionLon: "Position of report lon",
        userPositionLat: "Position of user lat",
        userPositionLon: "Position of user lon",
        layer: "Alert type"
      }
    );

    const team = await TeamService.getTeam(ctx.state.loggedUser.id);
    let teamData = null;
    if (team.data && team.data.attributes) {
      teamData = team.data.attributes;
    }

    const answers = await AnswersService.getAllTemplateAnswers({
      team: teamData,
      reportId: ctx.params.id,
      template: report,
      query: null,
      loggedUser: ctx.state.loggedUser
    });

    logger.info("Obtaining data");

    const data = answers
      .map(answer => answer.toObject())
      .map(answer => {
        const responses = {
          userId: answer.user || null,
          reportName: answer.reportName,
          areaOfInterest: answer.areaOfInterest || null,
          areaOfInterestName: answer.areaOfInterestName || null,
          clickedPositionLat: answer.clickedPosition.length ? answer.clickedPosition[0].lat : null,
          clickedPositionLon: answer.clickedPosition.length ? answer.clickedPosition[0].lon : null,
          userPositionLat: answer.userPosition.length ? answer.userPosition[0] : null,
          userPositionLon: answer.userPosition.length ? answer.userPosition[1] : null
        };

        answer.responses.forEach(response => {
          const currentQuestion = {
            ...report.questions.find(question => question.name && question.name === response.name)
          };

          responses[response.name] = response.value;
          if (response.value !== null && ["checkbox", "radio", "select"].includes(currentQuestion.type)) {
            const getCurrentValue = (list, val) =>
              list.find(item => item.value === val || item.value === parseInt(val, 10));
            // eslint-disable-next-line no-restricted-globals
            const values =
              !response.value.includes(",") && !isNaN(parseInt(response.value, 10))
                ? [response.value]
                : response.value.split(",");
            const questionValues = currentQuestion.values[report.defaultLanguage];
            responses[response.name] = values.reduce((acc, value) => {
              const val = getCurrentValue(questionValues, value);
              const accString = acc !== "" ? `${acc}, ` : acc;
              return typeof val !== "undefined" ? `${accString}${val.label}` : `${accString}${value}`;
            }, "");
          }
        });
        return Object.entries(responses).reduce((acc, [key, value]) => {
          const label = questionLabels[key] || key;
          return {
            ...acc,
            [label]: value
          };
        }, {});
      });
    ctx.body.write(CSV.convert(data));
    ctx.body.end();
  }
}

async function mapTemplateParamToId(ctx, next) {
  if (ctx.params.id === config.get("legacyTemplateId") || ctx.params.id === "default") {
    ctx.params.id = config.get("defaultTemplateId");
  }
  await next();
}

async function loggedUserToState(ctx, next) {
  if (ctx.query && ctx.query.loggedUser) {
    ctx.state.loggedUser = JSON.parse(ctx.query.loggedUser);
    delete ctx.query.loggedUser;
  } else if (ctx.request.body && ctx.request.body.loggedUser) {
    ctx.state.loggedUser = ctx.request.body.loggedUser;
    delete ctx.request.body.loggedUser;
  } else {
    ctx.throw(401, "Unauthorized");
    return;
  }
  console.log("finished");
  await next();
}

async function queryToState(ctx, next) {
  if (ctx.request.query && Object.keys(ctx.request.query).length > 0) {
    ctx.state.query = ctx.request.query;
  }
  await next();
}

// check permission must be added at some point
router.get("/getAllAnswersForUser", mapTemplateParamToId, loggedUserToState, ReportsRouter.getAllAnswers);
router.delete("/deleteAllAnswersForUser", mapTemplateParamToId, loggedUserToState, ReportsRouter.deleteAllAnswers);
router.post("/", loggedUserToState, ReportsValidator.create, ReportsRouter.save);
router.patch("/:id", mapTemplateParamToId, loggedUserToState, ReportsValidator.patch, ReportsRouter.patch);
router.get("/", loggedUserToState, queryToState, ReportsRouter.getAll);
router.get("/:id", mapTemplateParamToId, loggedUserToState, queryToState, ReportsRouter.get);
router.put("/:id", mapTemplateParamToId, loggedUserToState, queryToState, ReportsValidator.create, ReportsRouter.put);
router.delete("/:id", mapTemplateParamToId, loggedUserToState, queryToState, ReportsRouter.delete);
router.get("/:id/download-answers", mapTemplateParamToId, loggedUserToState, ReportsRouter.downloadAnswers);

module.exports = router;
