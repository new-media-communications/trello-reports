const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { google } = require('googleapis');
const { promisify } = require('util')
const config = require('./config')

async function authorize() {
  const credentials = config.get("google")
  const {client_secret, client_id, redirect_uris = []} = credentials.client;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  let accessToken = credentials.access_token
    
  if (!accessToken) {
   throw new Error('No token found!')
  }

  oAuth2Client.setCredentials(accessToken);

  return oAuth2Client;
}

async function getAccessTokenUrl(credentials) {
  const {client_secret, client_id, redirect_uris = []} = credentials.client;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: credentials.scopes,
  });

  return {oAuth2Client, authUrl};
}

async function getAccessToken(oAuth2Client, code) {
  return new Promise((resolve, reject) => {
    oAuth2Client.getToken(code, (err, token) => {
      if (err) {
        return reject(err);
      };

      resolve(token)
    });
  });
}


module.exports = { authorize, getAccessTokenUrl, getAccessToken  }