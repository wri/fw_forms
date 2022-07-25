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

  it("Get area answers should be successful and return all report answers for an area from monitor's team members", async function () {
    mockGetUserFromToken(ROLES.USER);

    const areaId1 = new ObjectId();
    const areaId2 = new ObjectId();
    const teamId1 = new ObjectId();
    const teamId2 = new ObjectId();
    const monitorId1 = new ObjectId();
    const monitorId2 = new ObjectId();

    // mock user's team users
    nock(config.get("v3teamsAPI.url"))
      .persist()
      .get(`/teams/${teamId1}/users`)
      .reply(200, {
        data: [
          {
            id: new ObjectId(),
            attributes: {
              teamId1,
              userId: ROLES.USER.id,
              role: "monitor"
            }
          },
          {
            id: new ObjectId(),
            attributes: {
              teamId1,
              userId: monitorId1,
              role: "monitor"
            }
          }
        ]
      });

    // mock a different team's users
    nock(config.get("v3teamsAPI.url"))
      .persist()
      .get(`/teams/${teamId2}/users`)
      .reply(200, {
        data: [
          {
            id: new ObjectId(),
            attributes: {
              teamId1,
              userId: monitorId2,
              role: "monitor"
            }
          }
        ]
      });

    // mock request to get all user's teams
    nock(config.get("v3teamsAPI.url"))
      .persist()
      .get(`/teams/user/${ROLES.USER.id}`)
      .reply(200, {
        data: [
          {
            id: teamId1,
            attributes: {
              userRole: "monitor"
            }
          }
        ]
      });

    // mock request to get all teams related to an area
    nock(config.get("apiAPI.url"))
      .persist()
      .get(`/area/areaTeams/${areaId1}`)
      .reply(200, {
        data: [
          teamId1, teamId2
        ]
      });

    // create report
    const publicReport = await createReport({ user: new ObjectId(ROLES.USER.id), public: true, defaultLanguage: 'en' });
    // answer for the given area
    const userAnswerArea1 = await createAnswer({ user: ROLES.USER.id, areaOfInterest: areaId1, report: publicReport._id, reportName: publicReport.name });
    // answer for a different area
    const userAnswerArea2 = await createAnswer({ user: ROLES.USER.id, areaOfInterest: areaId2, report: publicReport._id, reportName: publicReport.name });
    // answer for the given area by a team member of the user
    const monitor1AnswerArea1 = await createAnswer({ user: monitorId1, areaOfInterest: areaId1, report: publicReport._id, reportName: publicReport.name });
    // answer for a different area by a team member of the user
    const monitor1AnswerArea2 = await createAnswer({ user: monitorId1, areaOfInterest: areaId2, report: publicReport._id, reportName: publicReport.name });
    // answer for the given area by a non team member of the user
    const monitor2AnswerArea1 = await createAnswer({ user: monitorId2, areaOfInterest: areaId1, report: publicReport._id, reportName: publicReport.name });
    // answer for a different area by a non team member of the user
    const monitor2AnswerArea2 = await createAnswer({ user: monitorId2, areaOfInterest: areaId2, report: publicReport._id, reportName: publicReport.name });


    const response = await requester
      .get(`/v3/reports/${publicReport._id}/answers/area/${areaId1}`)
      .set("Authorization", `Bearer abcd`)
      .send();

    response.status.should.equal(200);
    response.body.should.have.property("data");
    response.body.data.should.be.an("array").and.length(2);

    const responseAnswerOne = response.body.data[0];
    const responseAnswerTwo = response.body.data[1];

    responseAnswerOne.id.should.equal(userAnswerArea1.id);
    responseAnswerOne.attributes.should.have.property("areaOfInterest").and.equal(areaId1.toString());

    responseAnswerTwo.id.should.equal(monitor1AnswerArea1.id);
    responseAnswerTwo.attributes.should.have.property("areaOfInterest").and.equal(areaId1.toString());

  });

  it("Get area answers should be successful and return all report answers for an area for ONLY a monitor if restriction in place", async function () {
    mockGetUserFromToken(ROLES.USER);

    const areaId1 = new ObjectId();
    const areaId2 = new ObjectId();
    const teamId1 = new ObjectId();
    const teamId2 = new ObjectId();
    const monitorId1 = new ObjectId();
    const monitorId2 = new ObjectId();

    // mock user's team users
    nock(config.get("v3teamsAPI.url"))
      .persist()
      .get(`/teams/${teamId1}/users`)
      .reply(200, {
        data: [
          {
            id: new ObjectId(),
            attributes: {
              teamId1,
              userId: ROLES.USER.id,
              role: "monitor"
            }
          },
          {
            id: new ObjectId(),
            attributes: {
              teamId1,
              userId: monitorId1,
              role: "monitor"
            }
          }
        ]
      });

    // mock a different team's users
    nock(config.get("v3teamsAPI.url"))
      .persist()
      .get(`/teams/${teamId2}/users`)
      .reply(200, {
        data: [
          {
            id: new ObjectId(),
            attributes: {
              teamId1,
              userId: monitorId2,
              role: "monitor"
            }
          }
        ]
      });

    // mock request to get all user's teams
    nock(config.get("v3teamsAPI.url"))
      .persist()
      .get(`/teams/user/${ROLES.USER.id}`)
      .reply(200, {
        data: [
          {
            id: teamId1,
            attributes: {
              userRole: "monitor"
            }
          }
        ]
      });

    // mock request to get all teams related to an area
    nock(config.get("apiAPI.url"))
      .persist()
      .get(`/area/areaTeams/${areaId1}`)
      .reply(200, {
        data: [
          teamId1, teamId2
        ]
      });

    // create report
    const publicReport = await createReport({ user: new ObjectId(ROLES.USER.id), public: true, defaultLanguage: 'en' });
    // answer for the given area
    const userAnswerArea1 = await createAnswer({ user: ROLES.USER.id, areaOfInterest: areaId1, report: publicReport._id, reportName: publicReport.name });
    // answer for a different area
    const userAnswerArea2 = await createAnswer({ user: ROLES.USER.id, areaOfInterest: areaId2, report: publicReport._id, reportName: publicReport.name });
    // answer for the given area by a team member of the user
    const monitor1AnswerArea1 = await createAnswer({ user: monitorId1, areaOfInterest: areaId1, report: publicReport._id, reportName: publicReport.name });
    // answer for a different area by a team member of the user
    const monitor1AnswerArea2 = await createAnswer({ user: monitorId1, areaOfInterest: areaId2, report: publicReport._id, reportName: publicReport.name });
    // answer for the given area by a non team member of the user
    const monitor2AnswerArea1 = await createAnswer({ user: monitorId2, areaOfInterest: areaId1, report: publicReport._id, reportName: publicReport.name });
    // answer for a different area by a non team member of the user
    const monitor2AnswerArea2 = await createAnswer({ user: monitorId2, areaOfInterest: areaId2, report: publicReport._id, reportName: publicReport.name });


    const response = await requester
      .get(`/v3/reports/${publicReport._id}/answers/area/${areaId1}?restricted=true`)
      .set("Authorization", `Bearer abcd`)
      .send();

    response.status.should.equal(200);
    response.body.should.have.property("data");
    response.body.data.should.be.an("array").and.length(1);

    const responseAnswerOne = response.body.data[0];

    responseAnswerOne.id.should.equal(userAnswerArea1.id);
    responseAnswerOne.attributes.should.have.property("areaOfInterest").and.equal(areaId1.toString());

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
      .get(`/teams/user/${ROLES.USER.id}`)
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
      .get(`/teams/user/${ROLES.USER.id}`)
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
