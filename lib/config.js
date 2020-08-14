const Configstore = require("configstore");

const pkg = require("../package.json");

const conf = new Configstore(pkg.name, {
  trello: {
    api_url: "https://api.trello.com/1",
    key: null,
    token: null,
  },
  google: {
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets.readonly",
      "https://www.googleapis.com/auth/spreadsheets",
    ],
    client: null,
    access_token: null,
  },
  app: {
    merge_users: {},
  },
});

module.exports = conf;
