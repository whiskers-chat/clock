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

function getParmas(command: String): RegExpMatchArray | null {
  const regex = /(\S+)/g;
  let parmas = command.match(regex);
  return parmas;
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
      post.reply({
        content: `@${post.username} Pong!`,
      });
      break;
    }
    case "help": {
      post.reply({
        content: `
          **Help Page 1:**\n
| Command | Args | Desc |
| -------- | ------- | ------- |
| ping || Check if the bot is online |
| help | ?Page: Number | This command |
| listTimeZones || List all available timezones. |
| getTime | ?TimeZone: String | Get the time in a timezone, default timezone is GMT. |
| getTime24H | ?TimeZone: String | Get the time in a timezone in 24H format, default timezone is GMT. |
          `,
      });
      break;
    }
    case "listtimezones": {
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
      break;
    }
    case "gettime": {
      const reqArgs = getParmas(post.content);
      let zonedTime = datetime().toZonedTime("ETC/GMT");
      let daySection = getDaySection(zonedTime.hour);
      let replyContent: string = `@${post.username} ${
        convertTo12H(zonedTime.hour)
      }:${zonedTime.minute} ${daySection} (ETC/GMT)!`;
      if (reqArgs?.length == 3) {
        const timeZone = reqArgs[2];
        if (masterTimeZoneList.includes(timeZone)) {
          zonedTime = datetime().toZonedTime(timeZone);
          daySection = getDaySection(zonedTime.hour);
          replyContent = `@${post.username} ${
            convertTo12H(zonedTime.hour)
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
      break;
    }
    case "gettime24h": {
      const reqArgs = getParmas(post.content);
      let zonedTime = datetime().toZonedTime("ETC/GMT");
      let replyContent: string =
        `@${post.username} ${zonedTime.hour}:${zonedTime.minute} (ETC/GMT)!`;
      if (reqArgs?.length == 3) {
        const timeZone = reqArgs[2];
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
      break;
    }
    case "search": {
      masterTimeZoneList.filter((value: String, index: number, array: String[]) => {
        if (array[index].toString().toLowerCase().includes(value)) {
          return true;
        }
      })
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
