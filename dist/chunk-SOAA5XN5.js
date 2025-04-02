var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/steam.ts
import { access, readFile, writeFile } from "fs/promises";
import { glob } from "glob";
import path from "path";
import os from "os";

// src/command.ts
import { spawn } from "child_process";
async function command(...args) {
  const process2 = spawn(args[0], args.slice(1), {
    stdio: "inherit"
  });
  return new Promise((resolve, reject) => {
    process2.on("error", reject);
    process2.on("exit", resolve);
  });
}

// src/unzip.ts
import decompress from "decompress";
import { buffer } from "stream/consumers";
async function unzip(url, output) {
  const { body } = await fetch(url);
  if (!body) {
    throw new Error("Failed to download file");
  }
  const buf = await buffer(body);
  return await decompress(buf, output);
}

// src/steam.ts
async function location() {
  const platform = process.platform === "win32" ? "windows" : process.platform === "darwin" ? "macos" : "linux";
  if (platform === "windows") {
    return path.resolve(os.tmpdir(), "steamcmd", "steamcmd.exe");
  } else if (platform === "linux" || platform === "macos") {
    return path.resolve(os.tmpdir(), "steamcmd", "steamcmd.sh");
  }
  throw new Error("Unsupported platform");
}
async function publish(username, options) {
  var _a;
  const steamcmd = await location();
  const exists = await access(steamcmd).then(() => true, () => false);
  if (!exists) {
    await download();
  }
  if (!await authenticated(username)) {
    throw new Error("Not authenticated");
  }
  if (!path.isAbsolute(options.folder)) {
    throw new Error("Folder must be an absolute path");
  }
  if (options.icon && !path.isAbsolute(options.icon)) {
    throw new Error("Icon must be an absolute path");
  }
  const fields = /* @__PURE__ */ new Map();
  fields.set("appid", options.appid);
  fields.set("contentfolder", options.folder);
  fields.set("publishedfileid", (_a = options.id) != null ? _a : "0");
  if (options.changelog) {
    fields.set("changenote", options.changelog.replace(/"/g, '\\"'));
  }
  if (options.icon) {
    fields.set("previewfile", options.icon);
  } else {
    if (!options.id) {
      fields.set("previewfile", "default_icon.png");
    }
  }
  if (options.title) {
    fields.set("title", options.title);
  }
  if (options.description) {
    fields.set("description", options.description.replace(/"/g, '\\"'));
  }
  if (options.visibility) {
    fields.set("visibility", options.visibility.toString());
  }
  const vdf = `"workshopitem"
{${Array.from(fields.entries()).map(([key, value]) => `
	"${key}" "${value}"`).join("")}
}`;
  console.log(`Generating VDF:
${vdf}`);
  await writeFile(path.resolve("addon.vdf"), vdf.trim());
  const code = await command(steamcmd, "+@ShutdownOnFailedCommand", "1", "+login", username, "+workshop_build_item", path.resolve("addon.vdf"), "+quit");
  if (code !== 0 && code !== 7) {
    throw new Error("Failed to publish addon");
  }
}
async function authenticated(username) {
  const steamcmd = await location();
  const exists = await access(steamcmd).then(() => true, () => false);
  if (!exists) {
    return false;
  }
  const filepath = await configLocation();
  try {
    const config = await readFile(filepath, "utf-8");
    return config.includes(`"${username}"`);
  } catch (e) {
    return false;
  }
}
async function login(username, credentials = {}) {
  console.log("Attempting to login to Steam...");
  console.log("	Checking for cached credentials...");
  const config = await configLocation();
  if (!config) {
    console.log("	No cached credentials found");
  } else {
    console.log("	Cached credentials found");
  }
  const steamcmd = await location();
  const exists = await access(steamcmd).then(() => true, () => false);
  if (!exists) {
    await download();
  }
  const { password, totp, vdf } = credentials;
  if (totp) {
    if (!password) {
      throw new Error("TOTP requires a password");
    }
    console.log("	Using TOTP");
    const code = await command(steamcmd, "+@ShutdownOnFailedCommand", "1", "+set_steam_guard_code", totp, "+login", username, password, "+quit");
    if (code !== 0 && code !== 7) {
      throw new Error("Failed to login to Steam");
    }
  } else if (password) {
    console.log("	Using password");
    const code = await command(steamcmd, "+@ShutdownOnFailedCommand", "1", "+login", username, password, "+quit");
    if (code !== 0 && code !== 7) {
      throw new Error("Failed to login to Steam");
    }
  } else if (vdf) {
    console.log("	Using VDF");
    await writeFile(config, Buffer.from(vdf, "base64"));
    const code = await command(steamcmd, "+@ShutdownOnFailedCommand", "1", "+login", username, "+quit");
    if (code !== 0 && code !== 7) {
      throw new Error("Failed to login to Steam");
    }
  } else {
    console.log("	Using cached credentials");
    if (!await authenticated(username)) {
      throw new Error("No login method provided");
    }
  }
  console.log("Successfully logged in to Steam");
}
async function update() {
  const steamcmd = await location();
  const exits = await access(steamcmd).then(() => true, () => false);
  if (!exits) {
    await download();
  }
  const code = await command(steamcmd, "+@ShutdownOnFailedCommand", "1", "+login", "anonymous", "+quit");
  if (code !== 0 && code !== 7) {
    throw new Error("Failed to update SteamCMD");
  }
}
async function download() {
  const platform = process.platform === "win32" ? "windows" : process.platform === "darwin" ? "macos" : "linux";
  if (platform === "windows") {
    const output = path.resolve(os.tmpdir(), "steamcmd");
    const files = await unzip("https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip", output);
    const executable = files.find((f) => f.path === "steamcmd.exe");
    if (!executable) {
      throw new Error("Failed to find steamcmd executable");
    }
    return path.resolve(output, executable.path);
  } else if (platform === "linux") {
    const output = path.resolve(os.tmpdir(), "steamcmd");
    const files = await unzip("https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz", output);
    const executable = files.find((f) => f.path === "steamcmd.sh");
    if (!executable) {
      throw new Error("Failed to find steamcmd executable");
    }
    return path.resolve(output, executable.path);
  } else if (platform === "macos") {
    const output = path.resolve(os.tmpdir(), "steamcmd");
    const files = await unzip("https://steamcdn-a.akamaihd.net/client/installer/steamcmd_osx.tar.gz", output);
    const executable = files.find((f) => f.path === "steamcmd.sh");
    if (!executable) {
      throw new Error("Failed to find steamcmd executable");
    }
    return path.resolve(output, executable.path);
  }
  throw new Error("Unsupported platform");
}
async function configLocation() {
  const platform = process.platform === "win32" ? "windows" : process.platform === "darwin" ? "macos" : "linux";
  if (platform === "windows") {
    let filepath = path.resolve(os.tmpdir(), "steamcmd", "config", "config.vdf");
    if (await access(filepath).then(() => true, () => false)) {
      return filepath;
    }
    const home = path.resolve(process.env["USERPROFILE"]);
    if (!await access(home).then(() => true, () => false)) {
      throw new Error("Failed to find Steam config");
    }
    [filepath] = await glob(`${home}/+(Steam|steam|.steam)/config/config.vdf`, { absolute: true, dot: true });
    if (!filepath) {
      throw new Error("Failed to find Steam config");
    }
    return filepath;
  } else if (platform === "linux" || platform === "macos") {
    let filepath = path.resolve(os.tmpdir(), "steamcmd", "config", "config.vdf");
    if (await access(filepath).then(() => true, () => false)) {
      return filepath;
    }
    const home = path.resolve(process.env["HOME"]);
    if (!await access(home).then(() => true, () => false)) {
      throw new Error("Failed to find Steam config");
    }
    [filepath] = await glob(`${home}/+(Steam|steam|.steam)/config/config.vdf`, { absolute: true, dot: true });
    if (!filepath) {
      throw new Error("Failed to find Steam config");
    }
    return filepath;
  }
  throw new Error("Unsupported platform");
}

// src/gmad.ts
import { access as access2, mkdir } from "fs/promises";
import path2 from "path";
import os2 from "os";
async function create(dir, out) {
  const gmad = await location2();
  const exists = await access2(gmad).then(() => true, () => false);
  if (!exists) {
    await download2();
  }
  const absolute = path2.resolve(out);
  await mkdir(path2.dirname(absolute), { recursive: true });
  const code = await command(gmad, "create", "-warninvalid", "-folder", dir, "-out", out);
  if (code !== 0) {
    throw new Error("Failed to create addon");
  }
  return absolute;
}
async function download2() {
  const platform = process.platform === "win32" ? "windows" : process.platform === "darwin" ? "macos" : "linux";
  const output = path2.resolve(os2.tmpdir(), "gmad");
  const files = await unzip(`https://github.com/WilliamVenner/fastgmad/releases/latest/download/fastgmad_${platform}.zip`, output);
  const executable = files.find((f) => f.path.startsWith("fastgmad") && !f.path.includes(".dll") && !f.path.includes(".so"));
  if (!executable) {
    throw new Error("Failed to find gmad executable");
  }
  return path2.resolve(output, executable.path);
}
async function location2() {
  const platform = process.platform === "win32" ? "windows" : process.platform === "darwin" ? "macos" : "linux";
  if (platform === "windows") {
    return path2.resolve(os2.tmpdir(), "gmad", "fastgmad.exe");
  } else if (platform === "linux" || platform === "macos") {
    return path2.resolve(os2.tmpdir(), "gmad", "fastgmad");
  }
  throw new Error("Unsupported platform");
}

export {
  __require,
  __commonJS,
  __toESM,
  publish,
  login,
  update,
  download,
  create,
  download2
};
//# sourceMappingURL=chunk-SOAA5XN5.js.map