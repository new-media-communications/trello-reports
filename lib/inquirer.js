const open = require('open');
const inquirer = require('inquirer');
const google = require('./google');
const config = require('./config');

const sleep  = (time) => new Promise((resolve, reject) => {
  setTimeout(resolve, time)
})
module.exports = {
  askForTrelloKey: () => {
    const questions = [
      {
        name: 'key',
        type: 'input',
        message: 'Enter your Trello Key:',
        validate: function( value ) {
          if (value.length) {
            return true;
          } else {
            return 'Please enter your trello key';
          }
        }
      },
    ];
    return inquirer.prompt(questions);
  },

  askForTrelloToken: async () => {
    const tokenUrl = `https://trello.com/1/authorize?expiration=30days&name=MyPersonalToken&scope=read&response_type=token&key=${config.get('trello.key')}`

    console.log(`Redirect to browser. Please wait... \n`)
    await sleep(3000)
    await open(tokenUrl);

    const questions = [
      {
        name: 'token',
        type: 'input',
        message: 'Enter your Trello Token:',
        validate: function(value) {
          if (value.length) {
            return true;
          } else {
            return 'Please enter your token.';
          }
        }
      }
    ];
    return inquirer.prompt(questions);
  },

  askForGoogleClientConfig: () => {
    const questions = [
      {
        name: 'configFilePath',
        type: 'input',
        message: 'Enter your google client config file path:',
        validate: function( value ) {
          if (value.length) {
            return true;
          } else {
            return 'Please enter config file path';
          }
        }
      },
    ];
    return inquirer.prompt(questions);
  },

  askForGoogleAccessToken: async () => {
    const { oAuth2Client, authUrl } = await google.getAccessTokenUrl(config.get('google'))

    console.log(`Redirect to browser. Please wait... \n`)
    await sleep(3000)
    await open(authUrl);
    const questions = [
      {
        name: 'accessToken',
        type: 'input',
        message: `Enter the code from that page here: `,
        validate: function( value ) {
          if (value.length) {
            return true;
          } else {
            return 'Please enter your code';
          }
        }
      },
    ];
  
    const { accessToken } = await inquirer.prompt(questions);

    return google.getAccessToken(oAuth2Client, accessToken)
  }
};