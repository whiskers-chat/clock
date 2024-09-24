import * as meow from "@meower/api-client";
import { datetime } from "https://deno.land/x/ptera/mod.ts";
import { timezone } from "./timezones.ts";

const meower = await meow.client.login({
  api_url: "https://api.meower.org",
  socket_url: "wss://server.meower.org",
  uploads_url: "https://uploads.meower.org",
  username: Deno.args[0],
  password: Deno.args[1],
});

type helpEntry = {
  command: string[];
  args: string;
  desc: string;
  examples: string[];
};

let helpSections: helpEntry[] = [];

const errorMsg =
  "Oh no, something went wrong. Contact support@whiskers.chat with this message and a time stamp so we can look into it.";
helpSections.push({
  command: ["ping"],
  args: "",
  desc: "Check if the bot is online",
  examples: ["@clock ping"]
});

helpSections.push({
  command: ["help"],
  args: "?Page: Number",
  desc: "Get help with the bot",
  examples: ["@clock help 2"]
});

helpSections.push({
  command: ["search"],
  args: "query: string",
  desc: "Searches for timezones from the db",
  examples: ["@clock search new", "@clock search ETC"]
});

helpSections.push({
  command: ["getTime", "time"],
  args: "?TimeZone: String, ?format: Number",
  desc: "Get the time in a timezone in 24H or 12H format, default timezone is GMT.",
  examples: ["@clock time America/Juneau 24","@clock time America/New_York","@clock time"]
});

helpSections.push({
  command: ["getDate", "date"],
  args: "?TimeZone: String, ?format: Number",
  desc: "Get the date in a timezone in 24H or 12H format, default timezone is GMT.",
  examples: ["@clock date Etc/GMT+1 24","@clock date America/New_York","@clock date"]
});

function createHelpPageTables(helpSections: helpEntry[]): string[] {
  const header = "| Command | Args | Desc |";
  const divider = "| ------ | ------- | ------- |";
  const base = "\n" + header + "\n" + divider + "\n";
  let index = 0;
  let page = 0;
  let results: string[] = [];
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

async function updateQuote(api: meow.client, newQuote: String) {
  const endPoint = `${meower.api.api_url}/me/config`;
  const response = await fetch(endPoint, {
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

function createTimeZoneList(): String[] {
  let timeZoneList: String[] = [];
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
  if (command[0].toLowerCase() != "@clock") return;
  switch (command[1].toLowerCase()) {
    case "ping": {
      try {
        post.reply({
          content: `@${post.username} Pong!`,
        });
      } catch (err) {
        post.reply({
          reply_to: [post.id],
          content: errorMsg,
        });
      } finally {
        break;
      }
    }
    case "help": {
      try {
        let page = 1;
        if (typeof (command[2]) != "undefined") page = command[2];
        post.reply({
          content: `
          **Help Page ${Number(page)}/${helpPageTable.length}:** ${
            helpPageTable[page - 1]
          }`,
        });
      } catch (err) {
        post.reply({
          reply_to: [post.id],
          content: errorMsg,
        });
      } finally {
        break;
      }
    }
    case "listtimezones": {
      try {
        const timeZoneList = [
          "Etc/GMT",
          "Etc/GMT+1",
          "Etc/GMT+10",
          "Etc/GMT+11",
          "Etc/GMT+12",
          "Etc/GMT+2",
          "Etc/GMT+3",
          "Etc/GMT+4",
          "Etc/GMT+5",
          "Etc/GMT+6",
          "Etc/GMT+7",
          "Etc/GMT+8",
          "Etc/GMT+9",
          "Etc/GMT-1",
          "Etc/GMT-10",
          "Etc/GMT-11",
          "Etc/GMT-12",
          "Etc/GMT-13",
          "Etc/GMT-14",
          "Etc/GMT-2",
          "Etc/GMT-3",
          "Etc/GMT-4",
          "Etc/GMT-5",
          "Etc/GMT-6",
          "Etc/GMT-7",
          "Etc/GMT-8",
          "Etc/GMT-9",
          "Etc/UTC",
        ];
        post.reply({
          content: `@${post.username} The time zones you can use are: \n${
            timeZoneList.join(", ")
          } \nThis is not a full list as the full version is too long to send.`,
        });
      } catch (err) {
        post.reply({
          reply_to: [post.id],
          content: errorMsg,
        });
      } finally {
        break;
      }
    }
    case "time":
    case "gettime": {
      try {
        let replyContent: string;
        let format = 12;
        let timeZone = "ETC/GMT";
        if (typeof(command[2]) == 'string') timeZone = command[2];
        if (typeof(command[3]) == 'string') format = Number(command[3]);
        const zonedTime = datetime().toZonedTime(timeZone);
        const daySection = getDaySection(zonedTime.hour);

        if (format == 12) {
          if (masterTimeZoneList.includes(timeZone)) {
            replyContent =
              `@${post.username} ${convertTo12H(zonedTime.hour)}:${zonedTime.minute} ${daySection} ${timeZone})!`;
          } else {
            replyContent =
              `@${post.username} I don't feel like telling you the time atm. \nERROR 35: Invalid Time Zone!`;
          }
        } else if (format == 24) {
          if (masterTimeZoneList.includes(timeZone)) {
            replyContent =
              `@${post.username} ${zonedTime.hour}:${zonedTime.minute} (${timeZone})!`;
          } else {
            replyContent =
              `@${post.username} I don't feel like telling you the time atm. \nERROR 35: Invalid Time Zone!`;
          }
        } else {
          replyContent = `@${post.username} I don't feel like telling you the time atm. \nERROR 36: Invalid format!`;
        }

        post.reply({
          reply_to: [post.id],
          content: replyContent,
        });
      } catch (err) {
        post.reply({
          reply_to: [post.id],
          content: errorMsg,
        });
      } finally {
        break;
      }
    }
    case "search": {
      try {
        if (typeof (command[2]) != "string") break;
        const searchValue = command[2];
        let results = masterTimeZoneList.filter((value) => {
          return value.toLowerCase().includes(searchValue.toLowerCase());
        });
        if (results.length == 0) results.push("No timezones found");
        let replyContent: string = `Search Results for ${searchValue}:\n${
          results.splice(0, 40).join(", ")
        } \nMax number of results is 30.`;
        post.reply({
          reply_to: [post.id],
          content: replyContent,
        });
      } catch (err) {
        post.reply({
          reply_to: [post.id],
          content: errorMsg,
        });
      } finally {
        break;
      }
    }
    case "date":
    case "getdate": {
      try {
        let replyContent: string;
        let format = 12;
        let timeZone = "ETC/GMT";
        if (typeof(command[2]) == 'string') timeZone = command[2];
        if (typeof(command[3]) == 'string') format = Number(command[3]);
        const zonedTime = datetime().toZonedTime(timeZone);
        const daySection = getDaySection(zonedTime.hour);

        if (format == 12) {
          if (masterTimeZoneList.includes(timeZone)) {
            replyContent =
              `@${post.username} ${convertTo12H(zonedTime.hour)}:${zonedTime.minute} ${daySection} ${zonedTime.month}/${zonedTime.day}/${zonedTime.year} (${timeZone})!`;
          } else {
            replyContent =
              `@${post.username} I don't feel like telling you the date atm. \nERROR 35: Invalid Time Zone!`;
          }
        } else if (format == 24) {
          if (masterTimeZoneList.includes(timeZone)) {
            replyContent =
              `@${post.username} ${zonedTime.hour}:${zonedTime.minute} ${zonedTime.month}/${zonedTime.day}/${zonedTime.year} (${timeZone})!`;
          } else {
            replyContent =
              `@${post.username} I don't feel like telling you the date atm. \nERROR 35: Invalid Time Zone!`;
          }
        } else {
          replyContent = `@${post.username} I don't feel like telling you the date atm. \nERROR 36: Invalid format!`;
        }

        post.reply({
          reply_to: [post.id],
          content: replyContent,
        });
      } catch (err) {
        post.reply({
          reply_to: [post.id],
          content: errorMsg,
        });
      } finally {
        break;
      }
    }
    default:
      post.reply({
        reply_to: [post.id],
        content: "Unknown Command",
      });
      break;
  }
});

// Runs on program close
Deno.addSignalListener("SIGINT", async () => {
  console.log("Exit");
  await updateQuote(
    meower,
    "Bot is offline ):\nrun by @Blahaj, if you have any issues, contact support@whiskers.chat",
  );
  Deno.exit();
});
