// Jest configuration for functional tests

module.exports = {
  "transform": {
    "^.+\\.js?": "babel-jest",
  },
  "globals": {
    "widow": true,
  },
  "collectCoverage": false,
  "reporters": [
    "default",
    [
      "./node_modules/jest-html-reporter",
      {
        "pageTitle": "Performance Test Report",
        "outputPath": "./performance-report.html",
      },
    ],
  ],
  "testPathIgnorePatterns": [
    "LruCache.test.js",
    "LruMap.test.js",
  ],
};
