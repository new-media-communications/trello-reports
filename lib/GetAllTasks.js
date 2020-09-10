const _ = require("lodash");
const moment = require("moment");
const slugify = require("slugify");

const TrelloBoard = require("./TrelloBoard");
const TrelloApi = require("./TrelloApi");
const GoogleSheetService = require("./GoogleSheetService");
const config = require("./config");

/**
 * The complete Triforce, or one or more components of the Triforce.
 * @typedef {Object} Options
 * @property {'daily'|'monthly'|'weekly'} [period]
 */

function dateFromObjectId(objectId) {
  return new Date(parseInt(objectId.substring(0, 8), 16) * 1000);
}

function getMemberName(member) {
  return config.get(`app.merge_users.${member.fullName}`) || member.fullName;
}

async function toSheetDataAll() {
  const allBoards = await new TrelloApi().myBoards();
  console.log(`All BOARDS SIZE=${allBoards.length}`);

  const boards = [];
  for (const b of allBoards) {
    console.log(`Getting memebers of BOARD=${b.name}`);
    const data = await new TrelloBoard(b).cardsWithMembers();
    boards.push(data);
  }

  const allTasks = _.flatMap(boards);

  const tasks = allTasks.map(({ card, members, board }) => {
    const createdAt = dateFromObjectId(card.id);
    // Month	Board	Task	Member	Start Date	End Date	Completed Date	Status
    return {
      ID: `${card.id}`,
      Month: moment(createdAt).format("MMMM"),
      Year: moment(createdAt).format("YYYY"),
      Board: board.name,
      Task: card.name,
      Member: members.map(getMemberName).join(", "),
      "Start Date": moment(createdAt).format("DD/MM/YYYY HH:mm") || "",
      "End Date": card.due
        ? moment(card.due).format("DD/MM/YYYY HH:mm")
        : "NO_DATE",
      StartDate: moment(createdAt).format("DD/MM/YYYY HH:mm") || "",
      EndDate: card.due
        ? moment(card.due).format("DD/MM/YYYY HH:mm")
        : "NO_DATE",
      Status: card.list.name,
      status: slugify(card.list.name),
      timestamp: moment(createdAt).unix(),
    };
  });

  return [
    {
      sheetName: `ALL`,
      data: _.orderBy(tasks, "timestamp", "desc"),
    },
  ];
}

async function toSheetDataByYearMonth() {
  const allBoards = await new TrelloApi().myBoards();

  const boards = [];

  for (const b of allBoards) {
    console.log(`Getting members and cards for board:${b.name}`);
    boards.push(await new TrelloBoard(b).cardsWithMembers());
    console.log(`FINISH getting members and cards for board:${b.name}`);
  }

  const allTasks = _.flatMap(boards);

  const tasks = allTasks.map(({ card, members, board }) => {
    const createdAt = dateFromObjectId(card.id);
    // Month	Board	Task	Member	Start Date	End Date	Completed Date	Status
    return {
      ID: `${card.id}`,
      Month: moment(createdAt).format("MMMM"),
      Year: moment(createdAt).format("YYYY"),
      Board: board.name,
      Task: card.name,
      Member: members.map(getMemberName).join(", "),
      "Start Date": moment(createdAt).format("DD/MM/YYYY HH:mm") || "",
      "End Date": card.due
        ? moment(card.due).format("DD/MM/YYYY HH:mm")
        : "NO_DATE",
      StartDate: moment(createdAt).format("DD/MM/YYYY HH:mm") || "",
      EndDate: card.due
        ? moment(card.due).format("DD/MM/YYYY HH:mm")
        : "NO_DATE",
      Status: card.list.name,
      status: slugify(card.list.name),
    };
  });

  const months = "January_February_March_April_May_June_July_August_September_October_November_December"
    .split("_")
    .reverse();
  const tasksByYear = _.groupBy(tasks, "Year");

  _.forEach(tasksByYear, function (value, key) {
    tasksByYear[key] = _.groupBy(tasksByYear[key], "Month");
  });

  const years = _.sortBy(Object.keys(tasksByYear).map(Number)).reverse();

  const sheetsData = _.flatMap(years, (year) => {
    const tasksByMonth = tasksByYear[`${year}`];
    return months
      .map((month) => {
        const tasks = tasksByMonth[month];
        if (!tasks) {
          return null;
        }
        return {
          sheetName: `${year}/${month}`,
          data: tasks,
        };
      })
      .filter((m) => !!m);
  });

  return sheetsData;
}

/**
 *
 * @param {Options} options
 */
async function toSheetDataByUser(options = {}) {
  const allBoards = await new TrelloApi().myBoards();

  const responses = [];

  for (const b of allBoards) {
    console.log(`Getting members and cards for board:${b.name}`);
    const response = await new TrelloBoard(b).membersAndCards();
    console.log(`FINISH getting members and cards for board:${b.name}`);
    responses.push(response);
  }

  const boards = _.flatMap(responses);

  const allTasks = _.flatMap(boards, ({ member, cards, board }) => {
    const memberName = getMemberName(member);
    let formattedCards = cards.map((card) => {
      const createdAt = dateFromObjectId(card.id);
      // Month	Board	Task	Member	Start Date	End Date	Completed Date	Status
      const status = slugify(card.list.name).toLowerCase();
      return {
        ID: `${card.id}`,
        Month: moment(createdAt).format("MMMM"),
        Year: moment(createdAt).format("YYYY"),
        Board: board.name,
        Task: card.name,
        Member: memberName,
        "Start Date": moment(createdAt).format("DD/MM/YYYY HH:mm") || "",
        "End Date": card.due
          ? moment(card.due).format("DD/MM/YYYY HH:mm")
          : "NO_DATE",
        StartDate: moment(createdAt).format("DD/MM/YYYY HH:mm") || "",
        EndDate: card.due
          ? moment(card.due).format("DD/MM/YYYY HH:mm")
          : "NO_DATE",
        Status: card.list.name,
        status: slugify(card.list.name),
        timestamp: moment(createdAt).unix(),
        due: card.due,
        isDue:
          card.due && moment(card.due).isBefore(moment()) && status !== "done",
        redLabel: ["postponed"].includes(status),
        greenLabel: ["done"].includes(status),
        blueLabel: ["in-review", "inreview", "review"].includes(status),
        defaultLabel: ![
          "done",
          "postponed",
          "in-review",
          "inreview",
          "review",
        ].includes(status),
      };
    });

    if (options.period) {
      const startDays = {
        daily: moment().startOf("month"),
        monthly: moment().startOf("month"),
        weekly: moment().startOf("week"),
      };
      const startOfDay = startDays[options.period];

      const endDays = {
        daily: moment().add(1, "day").endOf("day"),
        monthly: moment().add(1, "month").endOf("month"),
        weekly: moment().add(1, "week").endOf("week"),
      };
      const endOfDay = endDays[options.period];
      formattedCards = formattedCards.filter((card) => {
        const dueDate = card.due ? moment(card.due) : null;
        if (!dueDate) {
          return false;
        }
        return dueDate.isBetween(startOfDay, endOfDay);
      });
    }

    return formattedCards;
  });

  const tasksByMember = _.groupBy(allTasks, "Member");

  const members = _.sortBy(Object.keys(tasksByMember));

  console.log("Members: ", members);

  const sheetsData = members.map((member) => {
    const tasks = tasksByMember[member];
    return {
      sheetName: `${member}`,
      data: _.orderBy(tasks, ["timestamp"], ["desc"]),
    };
  });

  return sheetsData;
}

/**
 *
 * @param {Object} options
 * @param {string} options.spreadsheetId
 * @param {Array<Object>} sheetsData
 */
async function updateSheetData(options, sheetsData) {
  const { spreadsheetId } = options;

  const googleSheetService = await new GoogleSheetService({
    spreadsheetId,
  }).init();

  const spreadsheet = await googleSheetService.getSpreadsheet({
    includeGridData: false,
  });

  const sheets = spreadsheet.data.sheets || [];

  const missingSheets = [];

  sheetsData.forEach((sheetData, index) => {
    const sheet = sheets.find(
      (s) => s.properties.title === sheetData.sheetName
    );
    if (!sheet) {
      missingSheets.push({
        title: sheetData.sheetName,
        index: index + 1,
      });
    }
  });

  const sheetsToDelete = sheets.filter((sheet) => {
    const sheetData = sheetsData.find(
      (s) => s.sheetName === sheet.properties.title
    );
    return !sheetData && sheet.properties.title !== "PLACEHOLDER";
  });

  const placeholderSheet = _.find(sheets, (v) => {
    return _.get(v, "properties.title") === "PLACEHOLDER";
  });

  if (!placeholderSheet) {
    throw new Error("Need a PLACEHOLDER Sheet.");
  }

  if (sheetsToDelete.length) {
    const requests = sheetsToDelete.map(({ properties }) => {
      return {
        deleteSheet: {
          sheetId: properties.sheetId,
        },
      };
    });

    const res = await googleSheetService.batchUpdate({
      resource: {
        requests,
      },
    });
  }

  if (missingSheets.length) {
    const requests = missingSheets
      .map(({ title, index }) => {
        return {
          duplicateSheet: {
            sourceSheetId: placeholderSheet.properties.sheetId,
            newSheetName: title,
          },
        };
      })
      .reverse();

    const res = await googleSheetService.batchUpdate({
      resource: {
        requests,
      },
    });
  }

  const {
    data: {
      values: [header],
    },
  } = await googleSheetService.getSheet({
    range: "PLACEHOLDER",
  });

  const data = sheetsData.map((sheetData) => {
    const values = (sheetData.data || []).map((task) => {
      return header.map((col) => task[col]);
    });

    return {
      range: sheetData.sheetName,
      values: [header, ...values],
    };
  });
  const resource = {
    data,
    valueInputOption: "RAW",
  };

  const res = await googleSheetService.updateSheet({
    resource,
  });

  return true;
}

module.exports = {
  toSheetDataAll,
  toSheetDataByYearMonth,
  toSheetDataByUser,
  updateSheetData,
};
