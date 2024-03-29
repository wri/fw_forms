const axios = require("axios");
const config = require("config");
const logger = require("logger");
const loggedInUserService = require("./LoggedInUserService");

class TeamService {
  static *getTeam(user) {
    let team = {};
    try {
      logger.info("Getting teams for user", user);
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
      logger.info("Got user teams for user with id", user, team);
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
