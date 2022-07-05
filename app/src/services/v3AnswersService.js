const AnswersModel = require("models/answersModel");
const { ObjectId } = require("mongoose").Types;
const V3TeamService = require("./v3TeamService");

const createFilter = async (reportId, template, loggedUser, teams, query) => {
  let filter = {};
  let teamsManaged = [];
  const confirmedUsers = [];
  // add current user to users array
  confirmedUsers.push(loggedUser.id);

  if (teams.length > 0) {
    // check if user is manager of any teams
    teamsManaged = teams.filter(
      team => team.attributes.userRole === "manager" || team.attributes.userRole === "administrator"
    );
    // get all managed teams users
    if (teamsManaged.length > 0) {
      for await (const team of teamsManaged) {
        // get users of each team
        const users = await V3TeamService.getTeamUsers(team.id);
        confirmedUsers.push(...users.map(user => user.id));
      }
    }
  }

  // Admin users and owners of the report template can check all report answers
  if (loggedUser.role === "ADMIN" || loggedUser.id === template.user) {
    filter = {
      $and: [{ report: new ObjectId(reportId) }]
    };
  } else if (teamsManaged.length > 0) {
    // managers can check all report answers from the default template (the only public template) from him and his team's members
    filter = {
      $and: [{ report: new ObjectId(reportId) }, { user: { $in: confirmedUsers } }]
    };
  } else {
    // a user can see their own answers
    filter = {
      $and: [{ report: new ObjectId(reportId) }, { user: new ObjectId(loggedUser.id) }]
    };
  }
  if (query) {
    Object.keys(query).forEach(key => {
      filter.$and.push({ [key]: query[key] });
    });
  }
  return filter;
};

class AnswersService {
  static async getAllTemplateAnswers({ reportId, template, loggedUser, teams, query }) {
    let filter = createFilter(reportId, template, loggedUser, teams, query);
    return await AnswersModel.find(filter);
  }

  static async filterAnswersByArea({ reportId, template, loggedUser, teams, query, areaId }) {
    let filter = await createFilter(reportId, template, loggedUser, teams, query, areaId);
    filter.$and.push({ areaOfInterest: areaId });
    return await AnswersModel.find(filter);
  }

  static async getAllAnswers({ loggedUser, teams }) {
    let filter = {};
    let teamsManaged = [];
    const confirmedUsers = [];
    if (teams.length > 0) {
      // check if user is manager of any teams
      teamsManaged = teams.filter(
        team => team.attributes.userRole === "manager" || team.attributes.userRole === "administrator"
      );
      // get all managed teams users
      if (teamsManaged.length > 0) {
        for await (const team of teamsManaged) {
          // get users of each team and add to users array
          const users = await V3TeamService.getTeamUsers(team.id);
          confirmedUsers.push(...users.map(user => new ObjectId(user.attributes.userId)));
        }
      }
    }
    // add current user to users array
    confirmedUsers.push(new ObjectId(loggedUser.id));

    filter = { user: { $in: confirmedUsers } };

    return await AnswersModel.find(filter);
  }
}

module.exports = AnswersService;
