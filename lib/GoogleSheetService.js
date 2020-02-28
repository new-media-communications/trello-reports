const {google} = require('googleapis');
const util = require('util');
const _ = require('lodash');

const googleAuth = require("./google")

class GoogleSheetService {
  constructor({ spreadsheetId } = {}) {
    this.spreadsheetId = spreadsheetId

  }

  async init() {
    const auth = await googleAuth.authorize();
    const sheets = google.sheets({ version: 'v4', auth });
    this.sheets = sheets;
  
    this._getSheet = util.promisify(sheets.spreadsheets.values.get.bind(sheets))
    this._getSpreadsheet = util.promisify(sheets.spreadsheets.get.bind(sheets))
    this._batchUpdateSpreadsheet = util.promisify(sheets.spreadsheets.batchUpdate.bind(sheets))
    this._copySheet = util.promisify(sheets.spreadsheets.sheets.copyTo.bind(sheets))
    this._updateSheet = util.promisify(sheets.spreadsheets.values.batchUpdate.bind(sheets))

    return this;
  }

  getSpreadsheet(properties) {
    return this._getSpreadsheet({
      spreadsheetId: this.spreadsheetId,
      ...properties,
    })
  }

  batchUpdate(properties) {
    return this._batchUpdateSpreadsheet({
      spreadsheetId: this.spreadsheetId,
      ...properties,
    })
  }

  updateSheet(properties) {
    return this._updateSheet({
      spreadsheetId: this.spreadsheetId,
      ...properties,
    })
  }

  getSheet(properties) {
    return this._getSheet({
      spreadsheetId: this.spreadsheetId,
      ...properties,
    })
  }

  async copyOrGetSheet(sheetName) {
    const spreadsheetId = this.spreadsheetId
    try {
      const { data: { values: sheetValues } } = await this._getSheet({
        spreadsheetId,
        range: sheetName,
      })
      return sheetValues;
    } catch (error) {
      if (_.startsWith(_.get(error, 'response.data.error.message'), 'Unable to parse range')) {

        const res = await this._getSpreadsheet({
          spreadsheetId,
          includeGridData: false,
          fields: 'sheets.properties'
        })

        const placeholderSheet = _.find(_.get(res.data, 'sheets', []), (v) => {
          return _.get(v, 'properties.title') === 'PLACEHOLDER'
        })

        if (!placeholderSheet) {
          throw error;
        }

        const copyRes = await this._copySheet({
          spreadsheetId,
          sheetId: placeholderSheet.properties.sheetId,
          resource: {
            destinationSpreadsheetId: spreadsheetId,
          },
        })
        
        const { data: { values: sheetValues } } = await this._getSheet({
          spreadsheetId,
          range: copyRes.data.title,
        })

        const updateRes = await this._batchUpdateSpreadsheet({
          spreadsheetId,
          resource: {
            requests: [{
              updateSheetProperties: {
                properties: {
                  sheetId: copyRes.data.sheetId,
                  title: sheetName,
                },
                fields: 'title',
              }
            }]
          }
        })

        return [sheetValues[0]];
      } 
      throw error
    }
  }
}

module.exports = GoogleSheetService;
