#!/usr/bin/env node
const yargs = require("yargs");
const chalk = require("chalk");
const clear = require("clear");
const figlet = require("figlet");
const files = require("./lib/files");
const inquirer = require("./lib/inquirer");
const app = require("./lib/app");

clear();

console.log(
  chalk.yellow(figlet.textSync("Trello Report", { horizontalLayout: "full" }))
);

yargs
  .scriptName("trello-report")
  .usage("$0 <cmd> [args]")
  .command(
    "generate [spreadsheetId]",
    "Generate Excel report",
    (yargs) => {
      yargs.option("spreadsheetId", {
        type: "string",
        describe: "Google Spread Sheet Id",
        demandOption: true,
      });
      yargs.option("type", {
        type: "string",
        default: "by-month",
        choices: ["by-month", "by-user", "all"],
        describe: "Spreadsheet report type",
      });
    },
    async function (argv) {
      console.log("Generating report...");
      await app.maybeSetup();
      await app.generateSpreadsheet(argv.spreadsheetId, argv.type);
      console.log("DONE!");
    }
  )

  .command(
    "auto-resize [spreadsheetId]",
    "Autoresize Excel report",
    (yargs) => {
      yargs.option("spreadsheetId", {
        type: "string",
        describe: "Google Spread Sheet Id",
        demandOption: true,
      });
    },
    async function (argv) {
      console.log("Autoresize report...");
      await app.maybeSetup();
      await app.autoResizeSpreadsheet(argv.spreadsheetId);
      console.log("DONE!");
    }
  )

  .command(
    "auth google",
    "Get Google token",
    (yargs) => {},
    async function (argv) {
      await app.reAuthenticateGoogle();
      console.log("DONE!");
    }
  )

  .demandCommand(1, "You need at least one command before moving on")
  .help().argv;
