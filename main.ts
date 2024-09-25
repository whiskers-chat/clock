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
}

let helpSections: helpEntry[] = [];
const errorMsg = "Oh no, something went wrong. Contact support@whiskers.chat with this message and a time stamp so we can look into it."
helpSections.push({
  command: ["ping"],
  args: "",
  desc: "Check if the bot is online",
})

helpSections.push({
  command: ["help"],
  args: "?Page: Number",
  desc: "Get help with the bot",
})

helpSections.push({
  command: ["search"],
  args: "query: string",
  desc: "Searches for timezones from the db",
})

helpSections.push({
  command: ["search"],
  args: "query: string",
  desc: "Searches for timezones from the db",
})

helpSections.push({
  command: ["getTime", "time"],
  args: "?TimeZone: String",
  desc: "Get the time in a timezone, default timezone is GMT.",
})

helpSections.push({
  command: ["getTime24", "time24"],
  args: "?TimeZone: String",
  desc: "Get the time in a timezone in 24H format, default timezone is GMT.",
})

function createHelpPageTables(helpSections: helpEntry[]): string[] {
  const header = "| Command | Args | Desc |";
  const divider = "| ------ | ------- | ------- |";
  const base = "\n" + header + "\n" + divider + "\n";
  let index = 0;
  let page = 0;
  let results: string[] = [];
  helpSections.forEach(helpSection => {
    if (index % 5 == 0) {
      page++;
      results[page - 1] = base;
    }

    results[page - 1] += `| ${helpSection.command} | ${helpSection.args} | ${helpSection.desc} |\n`
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
        if (typeof (command[2]) != 'undefined') page = command[2];
        post.reply({
          content: `
          **Help Page ${Number(page)}/${helpPageTable.length}:** ${helpPageTable[page - 1]}`,
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
          content: `@${post.username} The time zones you can use are: \n${timeZoneList.join(", ")
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
        let zonedTime = datetime().toZonedTime("ETC/GMT");
        let daySection = getDaySection(zonedTime.hour);
        let replyContent: string = `@${post.username} ${convertTo12H(zonedTime.hour)
          }:${zonedTime.minute} ${daySection} (ETC/GMT)!`;
        if (command?.length == 3) {
          const timeZone = command[2];
          if (masterTimeZoneList.includes(timeZone)) {
            zonedTime = datetime().toZonedTime(timeZone);
            daySection = getDaySection(zonedTime.hour);
            replyContent = `@${post.username} ${convertTo12H(zonedTime.hour)
              }:${zonedTime.minute} ${daySection} (${timeZone})!`;
          } else {
            replyContent =
              `@${post.username} I don't feel like telling you the time atm. \nERROR 35: Invalid Time Zone!`;
          }
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
    case "time24":
    case "gettime24": {
      try {
        let zonedTime = datetime().toZonedTime("ETC/GMT");
        let replyContent: string =
          `@${post.username} ${zonedTime.hour}:${zonedTime.minute} (ETC/GMT)!`;
        if (command?.length == 3) {
          const timeZone = command[2];
          if (masterTimeZoneList.includes(timeZone)) {
            zonedTime = datetime().toZonedTime(timeZone);
            replyContent =
              `@${post.username} ${zonedTime.hour}:${zonedTime.minute} (${timeZone})!`;
          } else {
            replyContent =
              `@${post.username} I don't feel like telling you the time atm. \nERROR 35: Invalid Time Zone!`;
          }
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
        if (typeof (command[2]) != 'string') break;
        const searchValue = command[2];
        let results = masterTimeZoneList.filter((value) => {
          return value.toLowerCase().includes(searchValue.toLowerCase());
        });
        if (results.length == 0) results.push("No timezones found")
        let replyContent: string = `Search Results for ${searchValue}:\n${results.splice(0, 20).join(", ")} \nMax number of results is 20.`;
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
    "Bot is offline, Due to severe weather.\nrun by @Blahaj, if you have any issues, contact support@whiskers.chat",
  );
  Deno.exit();
});
