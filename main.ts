import * as meow from "@meower/api-client";
import { datetime } from "https://deno.land/x/ptera/mod.ts";
import { timezone } from "./timezones.ts";
import Fuse from "npm:fuse.js";

let user: string = "";
let password: string = "";
let hburl: string = "https://www.example.com";

if (Deno.env.get("user") !== undefined) {
  user = Deno.env.get("user")!;
}
if (Deno.env.get("password") !== undefined) {
  password = Deno.env.get("password")!;
}
if (Deno.env.get("hburl") !== undefined) {
  hburl = Deno.env.get("hburl")!;
}

const meower = await meow.client.login({
  api_url: "https://api.meower.org",
  socket_url: "wss://server.meower.org",
  uploads_url: "https://uploads.meower.org",
  username: user,
  password: password,
});

// Create code to send a heartbeat to betterstack.
setInterval(() => {
  try {
    fetch(hburl);
    console.log("HeartBeat sent to " + hburl);
  } catch (error) {
    console.log("Heartbeat failed");
    console.error(error);
  }
}, 60000);

type helpEntry = {
  command: string[];
  args: string;
  desc: string;
  examples: string[];
};

const helpSections: helpEntry[] = [];

const errorMsg =
  "Oh no, something went wrong. Contact support@whiskers.chat with this message and a time stamp so we can look into it.";
helpSections.push({
  command: ["ping"],
  args: "",
  desc: "Check if the bot is online",
  examples: ["@clock ping"],
});

helpSections.push({
  command: ["help"],
  args: "?Page: Number",
  desc: "Get help with the bot",
  examples: ["@clock help 2"],
});

helpSections.push({
  command: ["search"],
  args: "query: string",
  desc: "Searches for timezones from the db",
  examples: ["@clock search new", "@clock search ETC"],
});

helpSections.push({
  command: ["getTime", "time"],
  args: "?TimeZone: String, ?format: Number",
  desc:
    "Get the time in a timezone in 24H or 12H format, default timezone is GMT.",
  examples: [
    "@clock time America/Juneau 24",
    "@clock time America/New_York",
    "@clock time",
  ],
});

helpSections.push({
  command: ["getDate", "date"],
  args: "?TimeZone: String, ?format: Number",
  desc:
    "Get the date in a timezone in 24H or 12H format, default timezone is GMT.",
  examples: [
    "@clock date Etc/GMT+1 24",
    "@clock date America/New_York",
    "@clock date",
  ],
});

function logCommand(command: string[], user: string) {
  console.log(`COMMAND: @${user} ran ${command}`);
}

function createHelpPageTables(helpSections: helpEntry[]): string[] {
  const header = "| Command | Args | Desc |";
  const divider = "| ------ | ------- | ------- |";
  const base = "\n" + header + "\n" + divider + "\n";
  let index = 0;
  let page = 0;
  const results: string[] = [];
  helpSections.forEach((helpSection) => {
    if (index % 5 == 0) {
      page++;
      results[page - 1] = base;
    }

    results[page - 1] +=
      `| ${helpSection.command} | ${helpSection.args} | ${helpSection.desc} |\n`;
    index++;
  });

  return results;
}

const helpPageTable = createHelpPageTables(helpSections);

function getDaySection(hour: number): string {
  if (hour <= 12) {
    return "AM";
  } else {
    return "PM";
  }
}

function convertTo12H(hour: number): number {
  if (hour <= 12) {
    return hour;
  } else {
    return hour - 12;
  }
}

function fixTime(value: number): string {
  let result: string = value.toString();
  if (result.length == 1) result = "0" + result;
  return result;
}

async function updateQuote(api: meow.client, newQuote: string) {
  const endPoint = `${meower.api.api_url}/me/config`;
  await fetch(endPoint, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "Token": api.api.api_token,
    },
    body: JSON.stringify({
      quote: newQuote,
    }),
  });
}

function createTimeZoneList(): string[] {
  const timeZoneList: string[] = [];
  timezone.forEach((element) => {
    timeZoneList.push(element.id);
  });
  return timeZoneList;
}

const masterTimeZoneList = createTimeZoneList();

updateQuote(
  meower,
  "Bot is online!\nRun ```@clock help``` to see what I can do!\nrun by @Blahaj, if you have any issues, contact support@whiskers.chat",
);

meower.socket.on("create_message", (post) => {
  const command = post.content.split(" ");
  if (command[0].toLowerCase() != `@${user}`) return;
  switch (command[1].toLowerCase()) {
    case "ping": {
      try {
        post.reply({
          content: `@${post.username} Pong!`,
        });
        logCommand(command, post.username);
      } catch (error) {
        console.log("Error: Create_Message");
        console.error(error);
        post.reply({
          reply_to: [post.id],
          content: errorMsg,
        });
      }
      break;
    }
    case "help": {
      try {
        let page = 1;
        if (typeof (command[2]) != "undefined") page = Number(command[2]);
        post.reply({
          content: `
          **Help Page ${Number(page)}/${helpPageTable.length}:** ${
            helpPageTable[page - 1]
          }`,
        });
        logCommand(command, post.username);
      } catch (error) {
        console.log("Error: help");
        console.error(error);
        post.reply({
          reply_to: [post.id],
          content: errorMsg,
        });
      }
      break;
    }
    case "time":
    case "gettime": {
      try {
        let replyContent: string;
        let format = 12;
        let timeZone = "Etc/UTC";
        if (typeof (command[2]) == "string") timeZone = command[2];
        if (typeof (command[3]) == "string") format = Number(command[3]);
        const zonedTime = datetime().toZonedTime(timeZone);
        const daySection = getDaySection(zonedTime.hour);

        if (format == 12) {
          if (masterTimeZoneList.includes(timeZone)) {
            replyContent = `@${post.username} ${
              fixTime(convertTo12H(zonedTime.hour))
            }:${fixTime(zonedTime.minute)} ${daySection} (${timeZone})!`;
          } else {
            replyContent =
              `@${post.username} I don't feel like telling you the time atm. \nERROR 35: Invalid Time Zone!`;
          }
        } else if (format == 24) {
          if (masterTimeZoneList.includes(timeZone)) {
            replyContent = `@${post.username} ${fixTime(zonedTime.hour)}:${
              fixTime(zonedTime.minute)
            } (${timeZone})!`;
          } else {
            replyContent =
              `@${post.username} I don't feel like telling you the time atm. \nERROR 35: Invalid Time Zone!`;
          }
        } else {
          replyContent =
            `@${post.username} I don't feel like telling you the time atm. \nERROR 36: Invalid format!`;
        }

        post.reply({
          reply_to: [post.id],
          content: replyContent,
        });
        logCommand(command, post.username);
      } catch (error) {
        console.log("Error: getTime");
        console.error(error);
        post.reply({
          reply_to: [post.id],
          content: errorMsg,
        });
      }
      break;
    }
    case "search": {
      try {
        if (typeof (command[2]) != "string") break;
        const searchValue = command[2];
        const options = {
          includeScore: false,
          threshold: .4,
        };
        const fuse = new Fuse(masterTimeZoneList, options);
        const fuseResults = fuse.search(searchValue);
        const results: string[] = [];
        fuseResults.forEach((element) => {
          results.push(element.item);
        });
        if (results.length == 0) results.push("No timezones found");
        const replyContent: string = `Search Results for ${searchValue}:\n${
          results.splice(0, 40).join(", ")
        } \nMax number of results is 30.`;
        post.reply({
          reply_to: [post.id],
          content: replyContent,
        });
        logCommand(command, post.username);
      } catch (error) {
        console.log("Error: search");
        console.error(error);
        post.reply({
          reply_to: [post.id],
          content: errorMsg,
        });
      }
      break;
    }
    case "date":
    case "getdate": {
      try {
        let replyContent: string;
        let format = 12;
        let timeZone = "Etc/UTC";
        if (typeof (command[2]) == "string") timeZone = command[2];
        if (typeof (command[3]) == "string") format = Number(command[3]);
        const zonedTime = datetime().toZonedTime(timeZone);
        const daySection = getDaySection(zonedTime.hour);

        if (format == 12) {
          if (masterTimeZoneList.includes(timeZone)) {
            replyContent = `@${post.username} ${
              fixTime(convertTo12H(zonedTime.hour))
            }:${
              fixTime(zonedTime.minute)
            } ${daySection} ${zonedTime.month}/${zonedTime.day}/${zonedTime.year} (${timeZone})!`;
          } else {
            replyContent =
              `@${post.username} I don't feel like telling you the date atm. \nERROR 35: Invalid Time Zone!`;
          }
        } else if (format == 24) {
          if (masterTimeZoneList.includes(timeZone)) {
            replyContent = `@${post.username} ${fixTime(zonedTime.hour)}:${
              fixTime(zonedTime.minute)
            } ${zonedTime.month}/${zonedTime.day}/${zonedTime.year} (${timeZone})!`;
          } else {
            replyContent =
              `@${post.username} I don't feel like telling you the date atm. \nERROR 35: Invalid Time Zone!`;
          }
        } else {
          replyContent =
            `@${post.username} I don't feel like telling you the date atm. \nERROR 36: Invalid format!`;
        }

        post.reply({
          reply_to: [post.id],
          content: replyContent,
        });
        logCommand(command, post.username);
      } catch (error) {
        console.log("Error: date");
        console.error(error);
        post.reply({
          reply_to: [post.id],
          content: errorMsg,
        });
      }
      break;
    }
    case "example": {
      try {
        if (typeof (command[1]) != "string") {
          post.reply({
            reply_to: [post.id],
            content: "Enter a command to get examples for",
          });
          break;
        }
        const exCommand = command[1];
        let examples: string[] = [];
        helpSections.forEach((element) => {
          if (element.command[1].toLowerCase() == exCommand.toLowerCase()) {
            examples = element.examples;
          }
        });
        if (examples.length == 0) {
          post.reply({
            reply_to: [post.id],
            content: "Command Not Found",
          });
          break;
        }
        const replyContent = `Examples for: ${exCommand}\n${
          examples.join(", ")
        }`;
        post.reply({
          reply_to: [post.id],
          content: replyContent,
        });
      } catch (error) {
        console.log("Error: example");
        console.error(error);
        post.reply({
          reply_to: [post.id],
          content: errorMsg,
        });
      }
      break;
    }
    default:
      post.reply({
        reply_to: [post.id],
        content: "Unknown Command",
      });
      logCommand(command, post.username);
      break;
  }
});

// Runs on program close
Deno.addSignalListener("SIGINT", async () => {
  console.log("Exit");
  await updateQuote(
    meower,
    "Bot is offline. Visit https://status.whiskers.chat/ for more info.\nrun by @Blahaj, if you have any issues, contact support@whiskers.chat",
  );
  Deno.exit();
});
