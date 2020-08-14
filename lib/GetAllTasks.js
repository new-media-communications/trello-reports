const _ = require("lodash")
const moment = require("moment")
const TrelloBoard = require("./TrelloBoard")
const TrelloApi = require("./TrelloApi")
const GoogleSheetService = require("./GoogleSheetService")

function dateFromObjectId(objectId) {
	return new Date(parseInt(objectId.substring(0, 8), 16) * 1000);
};

async function toSheetDataAll() {
  const allBoards = await new TrelloApi().myBoards()
  console.log(`All BOARDS SIZE=${allBoards.length}`)

  const boards = []
  for (const b of allBoards) {
    console.log(`Getting memebers of BOARD=${b.name}`)
      const data = await new TrelloBoard(b).cardsWithMembers()
      boards.push(data);
  }
  
  const allTasks =  _.flatMap(boards);

  const tasks = allTasks.map(({card, members, board}) => {
    const createdAt = dateFromObjectId(card.id)
    // Month	Board	Task	Member	Start Date	End Date	Completed Date	Status
    return {
      ID: `${card.id}`,
      Month: moment(createdAt).format('MMMM'),
      Year: moment(createdAt).format('YYYY'),
      Board: board.name,
      Task:  card.name,
      Member: members.map(m => m.fullName).join(', '),
      'Start Date': moment(createdAt).format('DD/MM/YYYY HH:mm') || '',
      'End Date': card.due ? moment(card.due).format('DD/MM/YYYY HH:mm') : 'NO_DATE',
      Status: card.list.name,
      timestamp: moment(createdAt).unix(),
    }
  })

  return [
    {
      sheetName: `ALL`,
      data: _.orderBy(tasks, 'timestamp', 'desc')
    }
  ]
}

async function toSheetDataByYearMonth() {
  const allBoards = await new TrelloApi().myBoards()

  const boards =  await Promise.all(
    allBoards.map(b => {
      return new TrelloBoard(b).cardsWithMembers()
    })
  )
  
  const allTasks =  _.flatMap(boards);

  const tasks = allTasks.map(({card, members, board}) => {
    const createdAt = dateFromObjectId(card.id)
    // Month	Board	Task	Member	Start Date	End Date	Completed Date	Status
    return {
      ID: `${card.id}`,
      Month: moment(createdAt).format('MMMM'),
      Year: moment(createdAt).format('YYYY'),
      Board: board.name,
      Task:  card.name,
      Member: members.map(m => m.fullName).join(', '),
      'Start Date': moment(createdAt).format('DD/MM/YYYY HH:mm') || '',
      'End Date': card.due ? moment(card.due).format('DD/MM/YYYY HH:mm') : 'NO_DATE',
      Status: card.list.name
    }
  })

  const months = 'January_February_March_April_May_June_July_August_September_October_November_December'.split('_').reverse();
  const tasksByYear = _.groupBy(tasks, 'Year')

  _.forEach(tasksByYear, function(value, key) {
    tasksByYear[key] = _.groupBy(tasksByYear[key], 'Month');
  });

  const years = _.sortBy(Object.keys(tasksByYear).map(Number)).reverse()

  const sheetsData = _.flatMap(years, year => {
    const tasksByMonth = tasksByYear[`${year}`];
    return months.map(month => {
      const tasks = tasksByMonth[month]
      if (!tasks) {
        return null;
      }
      return {
        sheetName: `${year}/${month}`,
        data: tasks
      }
    }).filter(m => !!m)
  })

  return sheetsData
}

async function toSheetDataByUser() {
  const allBoards = await new TrelloApi().myBoards()

  const boards =  _.flatMap(await Promise.all(
    allBoards.map(b => {
      return new TrelloBoard(b).membersAndCards()
    })
  ))
  

  const allTasks = _.flatMap(boards, ({member, cards, board}) => {
    return cards.map(card => {
      const createdAt = dateFromObjectId(card.id)
      // Month	Board	Task	Member	Start Date	End Date	Completed Date	Status
      return {
        ID: `${card.id}`,
        Month: moment(createdAt).format('MMMM'),
        Year: moment(createdAt).format('YYYY'),
        Board: board.name,
        Task:  card.name,
        Member: member.fullName,
        'Start Date': moment(createdAt).format('DD/MM/YYYY HH:mm') || '',
        'End Date': card.due ? moment(card.due).format('DD/MM/YYYY HH:mm') : 'NO_DATE',
        Status: card.list.name,
        timestamp: moment(createdAt).unix()
      }
    })
  })


  const tasksByMember = _.groupBy(allTasks, 'Member')

  const members = _.sortBy(Object.keys(tasksByMember))

  const sheetsData = members.map(member => {
    const tasks = tasksByMember[member]
    return {
      sheetName: `${member}`,
      data: _.orderBy(tasks, ['timestamp'] , ['desc'])
    }
  })

  return sheetsData
}

/**
 * 
 * @param {Object} options 
 * @param {string} options.spreadsheetId
 * @param {Array<Object>} sheetsData
 */
async function updateSheetData(options, sheetsData) {
  const { spreadsheetId } = options

  const googleSheetService = await new GoogleSheetService({ spreadsheetId }).init()

  const spreadsheet = await googleSheetService.getSpreadsheet({ includeGridData: false })
  
  const sheets = spreadsheet.data.sheets || []
  

  const missingSheets = [];

  sheetsData.forEach((sheetData, index) => {
    const sheet = sheets.find(s => s.properties.title === sheetData.sheetName)
    if(!sheet) {
      missingSheets.push({
        title: sheetData.sheetName,
        index: index + 1,
      })
    }
  })

  const placeholderSheet = _.find(sheets, (v) => {
    return _.get(v, 'properties.title') === 'PLACEHOLDER'
  })


  if (!placeholderSheet) {
    throw new Error('Need a PLACEHOLDER Sheet.')
  }

  if (missingSheets.length) {
    const requests = missingSheets.map(({title, index}) => {
      return {
        duplicateSheet: {
          sourceSheetId: placeholderSheet.properties.sheetId,
          newSheetName: title,
        }
      }
    }).reverse()

    const res = await googleSheetService.batchUpdate({
      resource: {
        requests,
      }
    })
  }

  const { data: { values: [header] } }= await googleSheetService.getSheet({
    range: 'PLACEHOLDER',
  })

  const data = sheetsData.map(sheetData => {
    const values = (sheetData.data || []).map(task => {
      return header.map(col => task[col]);
    })

    return {
      range: sheetData.sheetName,
      values: [header, ...values],
    };
  })
  const resource = {
    data,
    valueInputOption: 'RAW',
  };

  const res = await googleSheetService.updateSheet({
      resource,
  })
  console.log(res.data);
}

module.exports = { toSheetDataByYearMonth, toSheetDataByUser, updateSheetData }