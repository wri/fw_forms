/* eslint-disable */
const nock = require("nock");
const chai = require("chai");
const Report = require("models/reportsModel");
const mongoose = require("mongoose");
const { createReport, mockGetUserFromToken, createAnswer } = require("./utils/helpers");
const { ROLES } = require("./utils/test.constants");
const { getTestServer } = require("./utils/test-server");
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

  it("Get answers should be successful and return a list of reports (populated db)", async function () {
    mockGetUserFromToken(ROLES.USER);

    const areaId1 = new ObjectId();
    const areaId2 = new ObjectId();

    const report = await createReport({ user: ROLES.USER.id, public: true, defaultLanguage: 'en' });
    const answerOne = await createAnswer({ user: ROLES.USER.id, areaOfInterest: areaId1, report: report._id, reportName: report.name });
    const answerTwo = await createAnswer({ user: ROLES.USER.id, areaOfInterest: areaId1, report: report._id, reportName: report.name });
    await createAnswer({ user: ROLES.USER.id, areaOfInterest: areaId2, report: report._id, reportName: report.name });

    const response = await requester
      .get(`/v3/reports/${report._id}/answers/area/${areaId1}`)
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

  afterEach(async function () {

    await Report.deleteMany({}).exec();
    await AnswersModel.deleteMany({}).exec();
    if (!nock.isDone()) {
      throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
    }

  });
});
