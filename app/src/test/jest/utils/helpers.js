/* eslint-disable */
const Report = require("models/reportsModel");
const AnswersModel = require("models/answersModel");
const nock = require("nock");
const config = require("config");
const { ROLES } = require("./test.constants");

const getUUID = () => Math.random().toString(36).substring(7);

const createReport = (additionalData = {}) => {
  const uuid = getUUID();

  return new Report({
    name: `Report ${uuid}`,
    user: ROLES.USER.id,
    languages: ["en"],
    defaultLanguage: "en",
    ...additionalData
  }).save();
};

const createAnswer = (additionalData = {}) => {
  const uuid = getUUID();

  return new AnswersModel({
    name: `Answer ${uuid}`,
    user: ROLES.USER.id,
    language: "en",
    ...additionalData
  }).save();
};

const mockGetUserFromToken = userProfile => {
  nock(config.get("controlTower.url"), { reqheaders: { authorization: "Bearer abcd" } })
    .get("/auth/user/me")
    .reply(200, userProfile);
};

module.exports = {
  mockGetUserFromToken,
  createReport,
  getUUID,
  createAnswer
};
