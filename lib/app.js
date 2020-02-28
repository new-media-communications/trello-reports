
const config = require('./config')
const files = require('./files')
const inquirer = require('./inquirer')
const GetAllTasks = require('./GetAllTasks')
const TrelloApi = require('./TrelloApi')

module.exports = {
  run: async () => {
    try {
      const spreadsheetId = '1Rb5Wp7uriTPg3gogCm5KHyfKSrgvjxWPGEZNMyt8H8g';
     
      console.log("done");
    } catch (error) {
      console.log(error)
    }
  },

  /**
   * @param {string} spreadsheetId
   * @param {string} type
   */
  generateSpreadsheet: async (spreadsheetId, type) => {
    let sheetData = null
    switch(type) {
      case 'by-month':
        sheetData = await GetAllTasks.toSheetDataByYearMonth()
        break;
      case 'by-user':
        sheetData = await GetAllTasks.toSheetDataByUser()
        break;
      default:
        break;
    }

    if (!sheetData) {
      return;
    }
  
    await GetAllTasks.updateSheetData({ spreadsheetId }, sheetData)
  },

  maybeSetup: async () => {
    const trelloKey = config.get('trello.key')
    const trelloToken = config.get('trello.token')
  
    if (!trelloKey) {
      const { key } = await inquirer.askForTrelloKey();
      config.set("trello.key", key);
    }
  
    if (!trelloToken) {
      const { token } = await inquirer.askForTrelloToken();
      config.set("trello.token", token);
    }
  
  
    try {
      await new TrelloApi().myBoards()
    } catch (error) {
      if (error.response.data === 'expired token') {
        const { token } = await inquirer.askForTrelloToken();
        config.set("trello.token", token);
      } else {
        console.log(error)
        return;
      }
    }
  
    const googleClient = config.get('google.client')
    const googleAccessToken = config.get('google.access_token')
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
  }
}