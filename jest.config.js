/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    testPathIgnorePatterns: ["/node_modules/", "<rootDir>/app/src/test/mocha/"],
    roots: ["app/src"],
    moduleDirectories: ["node_modules", "app/src"]
  };