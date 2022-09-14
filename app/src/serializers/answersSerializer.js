const JSONAPISerializer = require("jsonapi-serializer").Serializer;

const answersSerializer = new JSONAPISerializer("answers", {
  attributes: [
    "report",
    "reportName",
    "username",
    "fullName",
    "organization",
    "teamId",
    "areaOfInterest",
    "areaOfInterestName",
    "language",
    "userPosition",
    "clickedPosition",
    "startDate",
    "endDate",
    "layer",
    "user",
    "createdAt",
    "responses",
    "templateName"
  ],
  responses: {
    attributes: ["question", "answer"]
  },
  userPosition: {
    attributes: ["lat", "lon"]
  },
  clickedPosition: {
    attributes: ["lat", "lon"]
  },
  typeForAttribute(attribute) {
    return attribute;
  },
  keyForAttribute: "camelCase"
});

class AnswersSerializer {
  static serialize(data) {
    return answersSerializer.serialize(data);
  }
}

module.exports = AnswersSerializer;
