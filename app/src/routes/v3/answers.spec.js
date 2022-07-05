/* eslint-disable */
const nock = require("nock");
const chai = require("chai");
const Report = require("models/reportsModel");
const mongoose = require("mongoose");
const { createReport, mockGetUserFromToken, createAnswer } = require("../../test/jest/utils/helpers");
const { ROLES } = require("../../test/jest/utils/test.constants");
const { getTestServer } = require("../../test/jest/utils/test-server");
const AnswersModel = require("models/answersModel");
const { ObjectId } = require("mongoose").Types;
const config = require("config");

chai.should();

let requester;

describe("Get answers filtered by area tests", function () {
  beforeEach(async function () {
    if (process.env.NODE_ENV !== "test") {
      throw Error(
        `Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`
      );
    }

    requester = await getTestServer();

    await Report.deleteMany({}).exec();
    await AnswersModel.deleteMany({}).exec();
  });

    it('Get answers as an anonymous user should return an "Not logged" error with matching 401 HTTP code', async function () {
      const response = await requester.get(`/v1/reports/1/answers`).send();
  
      response.status.should.equal(401);
      response.body.should.have.property("errors").and.be.an("array").and.length(1);
      response.body.errors[0].should.have.property("status").and.equal(401);
      response.body.errors[0].should.have.property("detail").and.equal("Unauthorized");
    });

  it("Get area answers should be successful and return a list of report answers made by a monitor", async function () {
    mockGetUserFromToken(ROLES.USER);

    const areaId1 = new ObjectId();
    const areaId2 = new ObjectId();
    const teamId = new ObjectId();
    const monitorId = new ObjectId();

    nock(config.get("v3teamsAPI.url"))
      .persist()
      .get(`/teams/${teamId}/users`)
      .reply(200,{ data: [
        {
          id: new ObjectId(),
          attributes: {
            teamId,
            userId: ROLES.USER.id,
            role: "manager"
          }
        }
      ]});

      nock(config.get("v3teamsAPI.url"))
      .persist()
      .get(`/teams/users/${ROLES.USER.id}`)
      .reply(200,{ data: [
        {
          id: teamId,
          attributes: {
            userRole: "manager"
          }
        }
      ]});

    const publicReport = await createReport({ user: new ObjectId(ROLES.USER.id), public: true, defaultLanguage: 'en' });
    const privateReport = await createReport({ user: new ObjectId(ROLES.MANAGER.id), public: true, defaultLanguage: 'en' });
    const answerOne = await createAnswer({ user: ROLES.USER.id, areaOfInterest: areaId1, report: publicReport._id, reportName: publicReport.name });
    const answerTwo = await createAnswer({ user: ROLES.USER.id, areaOfInterest: areaId1, report: publicReport._id, reportName: publicReport.name });
    const monitorAnswer = await createAnswer({ user: monitorId, areaOfInterest: areaId1, report: publicReport._id, reportName: publicReport.name });
    await createAnswer({ user: ROLES.USER.id, areaOfInterest: areaId2, report: privateReport._id, reportName: privateReport.name });

    const response = await requester
      .get(`/v3/reports/${publicReport._id}/answers/area/${areaId1}`)
      .set("Authorization", `Bearer abcd`)
      .send();

    response.status.should.equal(200);
    response.body.should.have.property("data");
    response.body.data.should.be.an("array").and.length(2);

    const responseAnswerOne = response.body.data[0];
    const responseAnswerTwo = response.body.data[1];

    responseAnswerOne.id.should.equal(answerOne.id);
    responseAnswerOne.attributes.should.have.property("areaOfInterest").and.equal(areaId1.toString());

    responseAnswerTwo.id.should.equal(answerTwo.id);
    responseAnswerTwo.attributes.should.have.property("areaOfInterest").and.equal(areaId1.toString());

  });

  it("A monitor can get all their answers, regardless of template", async function () {
    mockGetUserFromToken(ROLES.USER);

    const teamId = new ObjectId();

    const reportOne = await createReport({ user: new ObjectId(ROLES.USER.id), public: true, defaultLanguage: 'en' });
    const reportTwo = await createReport({ user: new ObjectId(ROLES.USER.id), public: true, defaultLanguage: 'en' });
    const answerOne = await createAnswer({ user: ROLES.USER.id, areaOfInterest: new ObjectId(), report: reportOne._id, reportName: reportOne.name });
    const answerTwo = await createAnswer({ user: ROLES.USER.id, areaOfInterest: new ObjectId(), report: reportTwo._id, reportName: reportTwo.name });
    const answerThree = await createAnswer({ user: new ObjectId(), areaOfInterest: new ObjectId(), report: reportTwo._id, reportName: reportTwo.name });

    nock(config.get("v3teamsAPI.url"))
      .persist()
      .get(`/teams/${teamId}/users`)
      .reply(200,{ data: [
        {
          id: new ObjectId(),
          attributes: {
            teamId,
            userId: ROLES.USER.id,
            role: "monitor"
          }
        }
      ]});

      nock(config.get("v3teamsAPI.url"))
      .persist()
      .get(`/teams/users/${ROLES.USER.id}`)
      .reply(200,{ data: [
        {
          id: teamId,
          attributes: {
            userRole: "monitor"
          }
        }
      ]});

      const response = await requester
      .get(`/v3/reports/getAllAnswersForUser`)
      .set("Authorization", `Bearer abcd`)
      .send();

      response.status.should.equal(200);
      response.body.should.have.property("data");
      response.body.data.should.be.an("array").and.length(2);

      const responseAnswerOne = response.body.data[0];
      const responseAnswerTwo = response.body.data[1];

      responseAnswerOne.id.should.equal(answerOne.id);
      responseAnswerTwo.id.should.equal(answerTwo.id);

  });

  it("A manager can get all their answers, regardless of template, and answers made by team members", async function () {
    mockGetUserFromToken(ROLES.USER);

    const teamId = new ObjectId();
    const userOneId = new ObjectId();

    const reportOne = await createReport({ user: new ObjectId(ROLES.USER.id), public: true, defaultLanguage: 'en' });
    const reportTwo = await createReport({ user: new ObjectId(ROLES.USER.id), public: true, defaultLanguage: 'en' });
    const answerOne = await createAnswer({ user: ROLES.USER.id, areaOfInterest: new ObjectId(), report: reportOne._id, reportName: reportOne.name });
    const answerTwo = await createAnswer({ user: ROLES.USER.id, areaOfInterest: new ObjectId(), report: reportTwo._id, reportName: reportTwo.name });
    const answerThree = await createAnswer({ user: userOneId, areaOfInterest: new ObjectId(), report: reportTwo._id, reportName: reportTwo.name });

    nock(config.get("v3teamsAPI.url"))
      .persist()
      .get(`/teams/${teamId}/users`)
      .reply(200,{ data: [
        {
          id: new ObjectId(),
          attributes: {
            teamId,
            userId: ROLES.USER.id,
            role: "manager"
          }
        },
        {
          id: new ObjectId(),
          attributes: {
            teamId,
            userId: userOneId,
            role: "monitor"
          }
        }
      ]});

      nock(config.get("v3teamsAPI.url"))
      .persist()
      .get(`/teams/users/${ROLES.USER.id}`)
      .reply(200,{ data: [
        {
          id: teamId,
          attributes: {
            userRole: "manager"
          }
        }
      ]});

      const response = await requester
      .get(`/v3/reports/getAllAnswersForUser`)
      .set("Authorization", `Bearer abcd`)
      .send();

      response.status.should.equal(200);
      response.body.should.have.property("data");
      response.body.data.should.be.an("array").and.length(3);

      const responseAnswerOne = response.body.data[0];
      const responseAnswerTwo = response.body.data[1];
      const responseAnswerThree = response.body.data[2];

      responseAnswerOne.id.should.equal(answerOne.id);
      responseAnswerTwo.id.should.equal(answerTwo.id);
      responseAnswerThree.id.should.equal(answerThree.id);

  });

  afterEach(async function () {

    await Report.deleteMany({}).exec();
    await AnswersModel.deleteMany({}).exec();
    nock.cleanAll();

  });
});
