/* eslint-disable */
const chai = require("chai");
const chaiHttp = require("chai-http");

let requester;

chai.use(chaiHttp);

exports.getTestServer = async function getTestServer() {
  if (requester) {
    return requester;
  }

  const server = require("../../../app");
  requester = chai.request(server).keepOpen();

  return requester;
};
