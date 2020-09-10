const path = require("path");
const fs = require("fs");
const os = require("os");
const moment = require("moment");
const wkhtmltopdf = require("wkhtmltopdf");
const Handlebars = require("handlebars");
const { Mandrill } = require("mandrill-api/mandrill");
const config = require("../config");

async function render(tasks) {
  const html = await fs.promises.readFile(
    path.resolve(__dirname, "task_reports.html")
  );
  const template = Handlebars.compile(html.toString("utf8"));
  const htmlOut = template({ tasks });

  const fileName = `${os.tmpdir()}/task_reports_${Math.floor(Date.now())}.pdf`;
  const writeStream = fs.createWriteStream(fileName);

  return new Promise((resolve) => {
    wkhtmltopdf(htmlOut, { pageSize: "Letter" })
      .pipe(writeStream)
      .on("finish", () => resolve({ fileName, html: htmlOut }));
  });
}

async function send(tasks, sendToEmail) {
  const { fileName, html } = await render(tasks);
  const mandrillClient = new Mandrill(config.get("mandrill.key"));
  const fileContent = (await fs.promises.readFile(fileName)).toString("base64");

  const res = await new Promise((resolve, reject) => {
    mandrillClient.messages.send(
      {
        message: {
          html: html,
          text: "",
          subject: `Daily Task Report - ${moment().format("DD/MM/YYYY")}`,
          from_email: config.get("mandrill.sender_email"),
          from_name: config.get("mandrill.sender_name"),
          to: [
            {
              email: sendToEmail,
            },
          ],
          important: true,
          attachments: [
            {
              type: "application/pdf",
              name: path.basename(fileName),
              content: fileContent,
            },
          ],
        },
      },
      function (result) {
        resolve(result);
      },
      function (e) {
        reject(e);
      }
    );
  });

  console.log(`TaskReports.send: Email sended with success to ${sendToEmail}`);

  return {
    res,
    fileName,
  };
}

module.exports = {
  send,
  render,
};
