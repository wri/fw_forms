const axios = require("axios");
const config = require("config");
const logger = require("logger");
const loggedInUserService = require("./LoggedInUserService");

class V3TeamService {
  static *getUserTeams(user) {
    let teams = [];
    try {
      const baseURL = config.get("v3teamsAPI.url");
      const response = yield axios.default({
        baseURL,
        url: `/teams/user/${user}`,
        method: "GET",
        headers: {
          authorization: loggedInUserService.token
        }
      });
      teams = response.data.data;
    } catch (e) {
      logger.info("Failed to fetch teams");
    }
    if (teams.length === 0) {
      logger.info("User does not belong to a team.");
    }
    return teams;
  }
}

module.exports = V3TeamService;
