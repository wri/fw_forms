const logger = require('logger');
const axios = require('axios');
const loggedInUserService = require('./LoggedInUserService');

class TeamService {

    static* getTeam(user) {
        let team = {};
        try {
            let baseURL = process.env.TEAMS_API_URL;
            const response = yield axios.default({
                baseURL,
                url: `/teams/user/${user}`,
                method: 'GET',
                headers: {
                    'authorization': loggedInUserService.token
                }
            });
            team = response.data.data;
        } catch (e) {
            logger.info('Failed to fetch team');
        }
        if (!team.data) {
            logger.info('User does not belong to a team.');
        }
        return team;
    }

}

module.exports = TeamService;
