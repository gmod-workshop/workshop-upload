import decompress from "decompress";
import get from "download";
import { access, readFile, writeFile, mkdir, readdir } from "fs/promises";
import { glob } from 'glob';
import path from "path";
import { command } from "./command.js";
import { convert } from "./bbcode.js";

export interface PublishOptions {
    id?: string;
    appid: string;

    /**
     * The absolute path to the icon to upload.
     */
    icon?: string;
    title?: string;
    /**
     * The description to upload. This will be converted from Markdown to BBCode.
     */
    description?: string;
    visibility?: number;

    /**
     * The changelog to upload. This will be converted from Markdown to BBCode.
     */
    changelog?: string;

    /**
     * The absolute path to the folder or archive to upload.
     */
    folder: string;
}

export async function location(): Promise<string> {
    const os = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'macos' : 'linux';
    if (os === 'windows') {
        return path.resolve('steamcmd', 'steamcmd.exe')
    } else if (os === 'linux' || os === 'macos') {
        return path.resolve('steamcmd', 'steamcmd.sh')
    }

    throw new Error("Unsupported platform");
}

export async function publish(username: string, options: PublishOptions): Promise<void> {
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

    const fields = new Map<string, string>();
    fields.set("appid", options.appid);
    fields.set("contentfolder", options.folder);
    fields.set("publishedfileid", options.id ?? "0");

    if (options.changelog) {
        fields.set("changenote", convert(options.changelog));
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
        fields.set("description", convert(options.description));
    }

    if (options.visibility) {
        fields.set("visibility", options.visibility.toString());
    }

    const vdf = `"workshopitem"\n{${Array.from(fields.entries()).map(([key, value]) => `\n\t"${key}" "${value}"`).join('')}}\n}`;

    await writeFile(path.resolve('addon.vdf'), vdf.trim());

    const code = await command(steamcmd, "+@ShutdownOnFailedCommand", "1", "+login", username, "+workshop_build_item", path.resolve('addon.vdf'), "+quit");
    if (code !== 0 && code !== 7) {
        throw new Error("Failed to publish addon");
    }
}

export async function authenticated(username: string): Promise<boolean> {
    const steamcmd = await location();
    const exists = await access(steamcmd).then(() => true, () => false);
    if (!exists) {
        return false;
    }

    const filepath = await configLocation();

    try {
        const config = await readFile(filepath, "utf-8");
        return config.includes(`"${username}"`);
    } catch {
        return false;
    }
}

/**
 * Login to Steam.
 * This caches the login credentials for future use.
 * @param username Steam username
 * @param credentials Steam credentials. Optional if login credentials are already cached. 
 */
export async function login(username: string, credentials: { password?: string, totp?: string, vdf?: string } = {}): Promise<void> {
    console.log("Attempting to login to Steam...");

    console.log("\tChecking for cached credentials...");
    const config = await configLocation();
    if (!config) {
        console.log("\tNo cached credentials found");
    } else {
        console.log("\tCached credentials found");
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

        console.log("\tUsing TOTP");

        const code = await command(steamcmd, "+@ShutdownOnFailedCommand", "1", "+set_steam_guard_code", totp, "+login", username, password, "+quit");
        if (code !== 0 && code !== 7) {
            throw new Error("Failed to login to Steam");
        }
    } else if (password) {
        console.log("\tUsing password");

        const code = await command(steamcmd, "+@ShutdownOnFailedCommand", "1", "+login", username, password, "+quit");
        if (code !== 0 && code !== 7) {
            throw new Error("Failed to login to Steam");
        }
    } else if (vdf) {
        console.log("\tUsing VDF");

        await writeFile(config, Buffer.from(vdf, "base64"));

        const code = await command(steamcmd, "+@ShutdownOnFailedCommand", "1", "+login", username, "+quit");
        if (code !== 0 && code !== 7) {
            throw new Error("Failed to login to Steam");
        }
    } else {
        console.log("\tUsing cached credentials");

        if (!(await authenticated(username))) {
            throw new Error("No login method provided");
        }
    }

    console.log("Successfully logged in to Steam");
}

/**
 * Update SteamCMD. This does not require login.
 */
export async function update(): Promise<void> {
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

export async function download(): Promise<string> {
    const os = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'macos' : 'linux';

    if (os === 'windows') {
        const data = await get("https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip");

        const output = path.resolve("steamcmd");
    
        const files = await decompress(data, output);
    
        const executable = files.find(f => f.path === "steamcmd.exe");
    
        if (!executable) {
            throw new Error("Failed to find steamcmd executable");
        }
    
        return path.resolve(output, executable.path);
    } else if (os === 'linux')  {
        const data = await get("https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz");

        const output = path.resolve("steamcmd");
    
        const files = await decompress(data, output);
    
        const executable = files.find(f => f.path === "steamcmd.sh");
    
        if (!executable) {
            throw new Error("Failed to find steamcmd executable");
        }
    
        return path.resolve(output, executable.path);
    } else if (os === 'macos') {
        const data = await get("https://steamcdn-a.akamaihd.net/client/installer/steamcmd_osx.tar.gz");
        
        const output = path.resolve("steamcmd");
    
        const files = await decompress(data, output);
    
        const executable = files.find(f => f.path === "steamcmd.sh");
    
        if (!executable) {
            throw new Error("Failed to find steamcmd executable");
        }
    
        return path.resolve(output, executable.path);
    }

    throw new Error("Unsupported platform");
}

/**
 * 
 * @returns The absolute path to the Steam credentials file.
 */
export async function configLocation(): Promise<string> {
    const os = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'macos' : 'linux';
    if (os === 'windows') {
        let filepath = path.resolve('steamcmd', 'config', 'config.vdf');
        if (await access(filepath).then(() => true, () => false)) {
            return filepath;
        }

        const home = path.resolve(process.env['USERPROFILE']!!)
        if (!await access(home).then(() => true, () => false)) {
            throw new Error("Failed to find Steam config");
        }

        [filepath] = await glob(`${home}/+(Steam|steam|.steam)/config/config.vdf`, { absolute: true, dot: true });
        if (!filepath) {
            throw new Error("Failed to find Steam config");
        }

        return filepath;
    } else if (os === 'linux' || os === 'macos') {
        let filepath = path.resolve('steamcmd', 'config', 'config.vdf');
        if (await access(filepath).then(() => true, () => false)) {
            return filepath;
        }

        const home = path.resolve(process.env['HOME']!!)
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
