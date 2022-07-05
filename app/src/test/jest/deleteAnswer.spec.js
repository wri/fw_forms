/* eslint-disable */
const nock = require("nock");
const chai = require("chai");
const Report = require("models/reportsModel");
const mongoose = require("mongoose");
const { createReport, mockGetUserFromToken, createAnswer } = require("./utils/helpers");
const { ROLES } = require("./utils/test.constants");
const { getTestServer } = require("./utils/test-server");
const AnswersModel = require("models/answersModel");
const answersModel = require("../../models/answersModel");
const { ObjectId } = require("mongoose").Types;
const config = require("config");

chai.should();

let requester;

describe("Delete an answer", function () {
  beforeEach(async function () {
    if (process.env.NODE_ENV !== "test") {
      throw Error(
        `Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`
      );
    }

    requester = await getTestServer();
    await AnswersModel.deleteMany({}).exec();
    await Report.deleteMany({}).exec();

  });

  it('Delete answer as an anonymous user should return an "Not logged" error with matching 401 HTTP code', async function () {
    const response = await requester.delete(`/v3/reports/1/answers/1`).send();

    response.status.should.equal(401);
    response.body.should.have.property("errors").and.be.an("array").and.length(1);
    response.body.errors[0].should.have.property("status").and.equal(401);
    response.body.errors[0].should.have.property("detail").and.equal("Unauthorized");
  });

  it("Delete answer should be successful if user created it", async function () {
    mockGetUserFromToken(ROLES.USER);

    const areaId = new ObjectId();

    const report = await createReport({ user: ROLES.USER.id, public: true, defaultLanguage: 'en' });

    const answer = await createAnswer({ user: ROLES.USER.id, areaOfInterest: areaId, report: report._id, reportName: report.name });

    const response = await requester
      .delete(`/v3/reports/${report._id}/answers/${answer._id}`)
      .set("Authorization", `Bearer abcd`)
      .send();

    response.status.should.equal(204);
    const answers = await AnswersModel.find({});
    answers.length.should.equal(0)

  });

  it("Delete answer should be successful if user didn't create it but is a manager of a team associated with it's area", async function () {
    mockGetUserFromToken(ROLES.USER);

    const areaId = new ObjectId();
    const teamId1 = new ObjectId();
    const teamId2 = new ObjectId();

    const report = await createReport({ user: ROLES.USER.id, public: true, defaultLanguage: 'en' });

    const answer = await createAnswer({ user: new ObjectId(), areaOfInterest: areaId, report: report._id, reportName: report.name });

    nock(config.get("apiAPI.url"))
      .get(`/area/areaTeams/${areaId}`)
      .reply(200, {data: [teamId1, teamId2]}
      );

    nock(config.get("v3teamsAPI.url"))
      .get(`/teams/user/${ROLES.USER.id}`)
      .reply(200, {data: [
          {
            id: teamId2,
            attributes: {
              userRole: "manager"
            }
          }
      ]});

    const response = await requester
      .delete(`/v3/reports/${report._id}/answers/${answer._id}`)
      .set("Authorization", `Bearer abcd`)
      .send();

    response.status.should.equal(204);
    const answers = await AnswersModel.find({});
    answers.length.should.equal(0);

  });

  it("Delete answer should fail if user didn't create it and is monitor of team that is associated with it", async function () {
    mockGetUserFromToken(ROLES.USER);

    const areaId = new ObjectId();
    const teamId1 = new ObjectId();
    const teamId2 = new ObjectId();

    const report = await createReport({ user: ROLES.USER.id, public: true, defaultLanguage: 'en' });

    const answer = await createAnswer({ user: new ObjectId(), areaOfInterest: areaId, report: report._id, reportName: report.name });

    nock(config.get("apiAPI.url"))
      .get(`/area/areaTeams/${areaId}`)
      .reply(200, {data: [teamId1, teamId2] }
      );

    nock(config.get("v3teamsAPI.url"))
      .get(`/teams/user/${ROLES.USER.id}`)
      .reply(200, {data: [
          {
            id: teamId2,
            attributes: {
              userRole: "monitor"
            }
          }
      ]});
      
    const response = await requester
      .delete(`/v3/reports/${report._id}/answers/${answer._id}`)
      .set("Authorization", `Bearer abcd`)
      .send();

    response.status.should.equal(401);
    const answers = await AnswersModel.find({});
    answers.length.should.equal(1);

  });

  it("Delete answer should fail if user didn't create it and is manager of team that is NOT associated with it", async function () {
    mockGetUserFromToken(ROLES.USER);

    const areaId = new ObjectId();
    const teamId1 = new ObjectId();
    const teamId2 = new ObjectId();
    const teamId3 = new ObjectId();

    const report = await createReport({ user: ROLES.USER.id, public: true, defaultLanguage: 'en' });

    const answer = await createAnswer({ user: new ObjectId(), areaOfInterest: areaId, report: report._id, reportName: report.name });

    nock(config.get("apiAPI.url"))
      .get(`/area/areaTeams/${areaId}`)
      .reply(200, {data: [teamId1, teamId2] }
      );

    nock(config.get("v3teamsAPI.url"))
      .get(`/teams/user/${ROLES.USER.id}`)
      .reply(200, {data: [
          {
            id: teamId3,
            attributes: {
              userRole: "manager"
            }
          }
      ]});
      
    const response = await requester
      .delete(`/v3/reports/${report._id}/answers/${answer._id}`)
      .set("Authorization", `Bearer abcd`)
      .send();

    response.status.should.equal(401);
    const answers = await AnswersModel.find({});
    answers.length.should.equal(1);

  });


  afterEach(async function () {

    await Report.deleteMany({}).exec();
    await AnswersModel.deleteMany({}).exec();
    if (!nock.isDone()) {
      throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
    }

  });
});
