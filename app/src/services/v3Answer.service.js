const AnswersModel = require("models/answersModel");
const UserService = require("./user.service");
const AreaService = require("./area.service");
const { ObjectId } = require("mongoose").Types;
const V3TeamService = require("./v3Team.service");
const logger = require("logger");

const addUsernameToAnswers = async answers => {
  // hashtable to store usernames
  let users = {};

  for await (let answer of answers) {
    let userId = answer.user;
    if (users[userId]) answer.fullName = users[userId];
    // get username from hashtable
    else {
      // get user name from microservice
      const fullName = await UserService.getNameByIdMICROSERVICE(userId);
      answer.fullName = fullName;
      users[userId] = fullName; // add to hashtable
    }
  }

  return answers;
};

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
        confirmedUsers.push(...users.map(user => user.attributes.userId));
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
    // monitors can see their own answers
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
    let answers = await AnswersModel.find(filter);

    return await addUsernameToAnswers(answers);
  }

  //static async filterAnswersByArea({ reportId, template, loggedUser, teams, query, areaId }) {
  static async filterAnswersByArea({ reportId, teams, areaId, loggedUser, restricted }) {
    // monitors can see reports from their team members in this area

    // get all area teams
    const areaTeams = await AreaService.getAreaTeams(areaId);
    // filter area teams by user teams
    const filteredTeams = teams.filter(team => areaTeams.includes(team.id.toString()));
    // extract all user ids
    let userIds = [];
    // get all filtered teams users if unrestricted
    if (!restricted && filteredTeams.length > 0) {
      for await (const team of filteredTeams) {
        // get users of each team
        const users = await V3TeamService.getTeamUsers(team.id);
        userIds.push(...users.map(user => user.attributes.userId));
      }
    }
    // else just get user's reports
    else userIds.push(loggedUser.id);

    let filter = {
      $and: [{ report: new ObjectId(reportId) }, { user: { $in: userIds } }, { areaOfInterest: areaId }]
    };
    //let filter = await createFilter(reportId, template, loggedUser, teams, query, areaId);
    let answers = await AnswersModel.find(filter);

    return await addUsernameToAnswers(answers);
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
          if(users) confirmedUsers.push(...users.map(user => new ObjectId(user.attributes.userId)));
        }
      }
    }
    // add current user to users array
    confirmedUsers.push(new ObjectId(loggedUser.id));

    filter = { user: { $in: confirmedUsers } };

    let answers = await AnswersModel.find(filter);

    return await addUsernameToAnswers(answers);
  }

  static async deleteAllAnswers({ loggedUser }) {
    const { deletedCount } = await AnswersModel.deleteMany({ user: loggedUser.id });
    logger.info(`${deletedCount} reports deleted`);
    return Promise.resolve();
  }
}

module.exports = AnswersService;
