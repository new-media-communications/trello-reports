const _ = require("lodash");
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { google } = require("googleapis");
const { promisify } = require("util");

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

async function getAuth() {
  const filePath = path.resolve("./config/config.json");
  const credentials = JSON.parse(await readFileAsync(filePath));
  return authorize(_.get(credentials, "google"), credentials, filePath);
}

async function authorize(credentials, config, filePath) {
  const { client_secret, client_id, redirect_uris = [] } = credentials.client;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  let accessToken = credentials.access_token;

  if (!accessToken) {
    accessToken = await getNewToken(oAuth2Client, credentials);
    _.set(config, "google.access_token", accessToken);
    await writeFileAsync(filePath, JSON.stringify(config, null, 4));
  }

  oAuth2Client.setCredentials(accessToken);

  return oAuth2Client;
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {Object} credentials
 */
function getNewToken(oAuth2Client, credentials) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: credentials.scopes,
  });
  console.log("Authorize this app by visiting this url:", authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve, reject) => {
    rl.question("Enter the code from that page here: ", (code) => {
      rl.close();

      oAuth2Client.getToken(code, (err, token) => {
        if (err) {
          console.error("Error while trying to retrieve access token", err);
          return reject(err);
        }

        resolve(token);
      });
    });
  });
}

async function getAccessTokenUrl(credentials) {
  const { client_secret, client_id, redirect_uris = [] } = credentials.client;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: credentials.scopes,
  });

  return { oAuth2Client, authUrl };
}

async function getAccessToken(oAuth2Client, code) {
  return new Promise((resolve, reject) => {
    oAuth2Client.getToken(code, (err, token) => {
      if (err) {
        console.error("Error while trying to retrieve access token", err);
        return reject(err);
      }

      resolve(token);
    });
  });
}

module.exports = { getAuth, getAccessTokenUrl, getAccessToken };
