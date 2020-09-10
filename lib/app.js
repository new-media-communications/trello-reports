const config = require("./config");
const files = require("./files");
const inquirer = require("./inquirer");
const GetAllTasks = require("./GetAllTasks");
const TrelloApi = require("./TrelloApi");
const GoogleSheetService = require("./GoogleSheetService");
const taskReports = require("./emails/taskReports");

module.exports = {
  /**
   * @param {string} spreadsheetId
   * @param {string} type
   * @param {any} options
   */
  generateSpreadsheet: async (spreadsheetId, type, options) => {
    let sheetData = null;
    switch (type) {
      case "by-month":
        sheetData = await GetAllTasks.toSheetDataByYearMonth(options);
        break;
      case "by-user":
        sheetData = await GetAllTasks.toSheetDataByUser(options);
        break;
      case "all":
        sheetData = await GetAllTasks.toSheetDataAll(options);
        break;
      default:
        break;
    }

    if (!sheetData) {
      return;
    }

    if (options.sendEmail) {
      await taskReports.send(sheetData, options.sendEmail);
    }

    await GetAllTasks.updateSheetData({ spreadsheetId }, sheetData);
  },

  autoResizeSpreadsheet: async (spreadsheetId) => {
    await (await new GoogleSheetService({ spreadsheetId }).init()).autoResize();
  },

  maybeSetupMandrill: async () => {
    const mandrillKey = config.get("mandrill.key");
    if (!mandrillKey) {
      const {
        key,
        sender_email,
        sender_name,
      } = await inquirer.askForMandrillConfig();
      config.set("mandrill.key", key);
      config.set("mandrill.sender_email", sender_email);
      config.set("mandrill.sender_name", sender_name);
    }
  },

  maybeSetup: async () => {
    const trelloKey = config.get("trello.key");
    const trelloToken = config.get("trello.token");

    if (!trelloKey) {
      const { key } = await inquirer.askForTrelloKey();
      config.set("trello.key", key);
    }

    if (!trelloToken) {
      const { token } = await inquirer.askForTrelloToken();
      config.set("trello.token", token);
    }

    try {
      await new TrelloApi().myBoards();
    } catch (error) {
      if (
        error.response.data === "expired token" ||
        error.response.data === "invalid token"
      ) {
        const { token } = await inquirer.askForTrelloToken();
        config.set("trello.token", token);
      } else {
        console.log(error.response.data);
        return;
      }
    }

    const googleClient = config.get("google.client");
    const googleAccessToken = config.get("google.access_token");
    if (!googleClient) {
      const { configFilePath } = await inquirer.askForGoogleClientConfig();
      const googleClientConfig = await files.getJsonFileContent(configFilePath);
      config.set("google.client", googleClientConfig.installed);
    }

    if (!googleAccessToken) {
      const accessToken = await inquirer.askForGoogleAccessToken();
      config.set("google.access_token", accessToken);
    }
  },
  reAuthenticateGoogle: async () => {
    const accessToken = await inquirer.askForGoogleAccessToken();
    config.set("google.access_token", accessToken);
  },
};
