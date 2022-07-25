const axios = require("axios");
const config = require("config");
const logger = require("logger");
const loggedInUserService = require("./LoggedInUserService");

class AreaService {
  static async deleteTemplateAreaRelations(templateId) {
    try {
      const baseURL = config.get("apiAPI.url");
      await axios.default({
        baseURL,
        url: `/area/templates`,
        method: "DELETE",
        headers: {
          authorization: loggedInUserService.token
        },
        data: { templateId }
      });
    } catch (e) {
      logger.info("Failed to delete relations");
    }
    return Promise.resolve();
  }

  static async getAreaTeams(areaId) {
    let teams = [];
    try {
      const baseURL = config.get("apiAPI.url");
      const response = await axios.default({
        baseURL,
        url: `/area/areaTeams/${areaId}`,
        method: "GET",
        headers: {
          authorization: loggedInUserService.token
        }
      });
      teams = response.data;
    } catch (e) {
      logger.info("Failed to get teams");
    }

    return Promise.resolve(teams.data);
  }
}

module.exports = AreaService;
