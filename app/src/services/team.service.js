const axios = require("axios");
const config = require("config");
const logger = require("logger");
const loggedInUserService = require("./LoggedInUserService");

class TeamService {
  static *getTeam(user) {
    let team = {};
    try {
      const baseURL = config.get("teamsAPI.url");
      const response = yield axios.default({
        baseURL,
        url: `/teams/user/${user}`,
        method: "GET",
        headers: {
          authorization: loggedInUserService.token
        }
      });
      team = response.data;
      logger.info("Got user teams", team)
    } catch (e) {
      logger.info("Failed to fetch team");
    }
    if (!team.data) {
      logger.info("User does not belong to a team.");
    }
    return team;
  }
}

module.exports = TeamService;
