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
        data: {templateId}
      });
    } catch (e) {
      logger.info("Failed to delete relations");
    }
    return Promise.resolve();
  }
}

module.exports = AreaService;