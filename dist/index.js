import {
  create,
  download,
  download2,
  login,
  publish,
  update
} from "./chunk-SOAA5XN5.js";

// src/index.ts
import { getInput } from "@actions/core";
import path from "path";
import os from "os";

// src/bbcode.ts
import { Converter } from "@gmod-workshop/steamdown";
async function convert(markdown) {
  const converter = new Converter();
  const bbcode = await converter.convert(markdown);
  return bbcode.replace(/https:\/\/github\.com\/([^\/]+\/[^\/]+)\/(issues|pull)\/(\d+)/g, "[url=https://github.com/$1/$2/$3]#$3[/url]").trim();
}

// src/index.ts
async function run() {
  const username = getInput("username", { required: true, trimWhitespace: true });
  const password = getInput("password", { trimWhitespace: true });
  const totp = getInput("totp", { trimWhitespace: true });
  const vdf = getInput("vdf");
  if (!password && !totp && !vdf) {
    throw new Error("No login method provided");
  }
  const id = getInput("id", { required: false, trimWhitespace: true });
  const title = getInput("title", { trimWhitespace: true });
  const icon = getInput("icon", { trimWhitespace: true });
  const description = getInput("description", { trimWhitespace: false });
  const markdownDescription = getInput("markdown-description");
  if (description && markdownDescription) {
    throw new Error("Cannot provide both description and markdown-description");
  }
  let realDescription = description;
  if (!description && markdownDescription) {
    realDescription = await convert(markdownDescription);
  }
  const visibility = getInput("visibility", { trimWhitespace: true });
  const changelog = getInput("changelog");
  const markdownChangelog = getInput("markdown-changelog");
  let realChangelog = changelog;
  if (!changelog && markdownChangelog) {
    realChangelog = await convert(markdownChangelog);
  }
  if (changelog && markdownChangelog) {
    throw new Error("Cannot provide both changelog and markdown-changelog");
  }
  const dir = getInput("folder", { required: true });
  console.log("Downloading SteamCMD...");
  await download();
  console.log("Updating SteamCMD...");
  await update();
  console.log("Logging in to Steam...");
  await login(username, { password, totp, vdf });
  console.log("Downloading gmad...");
  await download2();
  console.log("Creating addon...");
  const addon = await create(dir, path.resolve(os.tmpdir(), "addon", "addon.gma"));
  const folder = path.dirname(addon);
  console.log("Publishing addon...");
  await publish(username, {
    id,
    appid: "4000",
    changelog: realChangelog,
    icon,
    folder,
    title,
    description: realDescription,
    visibility: parseInt(visibility)
  });
  console.log("Done!");
}
run();
//# sourceMappingURL=index.js.map