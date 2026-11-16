import { access, readFile, writeFile } from "fs/promises";
import { glob } from 'glob';
import path from "path";
import os from "os";
import { fileURLToPath } from "url";

import { command } from "./command.js";
import { unzip } from "./unzip.js";

/**
 * Shipped with the action, one folder up from both src/ and dist/.
 */
export const DEFAULT_ICON = fileURLToPath(new URL("../default_icon.png", import.meta.url));

/**
 * Workshop visibility values used by `workshop_build_item`.
 */
export const VISIBILITY = {
    public: 0,
    friends_only: 1,
    private: 2,
    unlisted: 3,
} as const;

/**
 * Parse a visibility input: a name (`public`, `friends_only`, `private`, `unlisted`) or its number (0-3).
 * @returns The numeric visibility, or undefined to leave it unchanged.
 */
export function parseVisibility(input: string | undefined): number | undefined {
    const value = input?.trim().toLowerCase().replace(/[\s-]+/g, "_");
    if (!value) {
        return undefined;
    }

    if (value in VISIBILITY) {
        return VISIBILITY[value as keyof typeof VISIBILITY];
    }

    const number = Number(value);
    if (Number.isInteger(number) && Object.values(VISIBILITY).includes(number as never)) {
        return number;
    }

    throw new Error(`Invalid visibility "${input}". Use one of: ${Object.keys(VISIBILITY).join(", ")} (or 0-3).`);
}

export interface PublishOptions {
    /**
     * The Workshop item to update. Empty or "0" creates a new item.
     */
    id?: string;
    appid: string;

    /**
     * The absolute path to the icon to upload.
     */
    icon?: string;
    title?: string;
    /**
     * The description to upload, in Steam BBCode.
     */
    description?: string;
    /**
     * See {@link VISIBILITY}. Undefined leaves it unchanged.
     */
    visibility?: number;

    /**
     * The change note to upload, in Steam BBCode.
     */
    changelog?: string;

    /**
     * The absolute path to the folder to upload.
     */
    folder: string;
}

/**
 * Escape a value for a quoted KeyValues (VDF) string.
 */
export function escapeVdf(value: string): string {
    return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Build the `workshop_build_item` VDF for an item.
 */
export function workshopItemVdf(options: PublishOptions): string {
    const fields = new Map<string, string>();
    fields.set("appid", options.appid);
    fields.set("contentfolder", options.folder);
    fields.set("publishedfileid", options.id || "0");

    if (options.changelog) {
        fields.set("changenote", options.changelog);
    }

    if (options.icon) {
        fields.set("previewfile", options.icon);
    }

    if (options.title) {
        fields.set("title", options.title);
    }

    if (options.description) {
        fields.set("description", options.description);
    }

    if (options.visibility !== undefined) {
        fields.set("visibility", options.visibility.toString());
    }

    const lines = Array.from(fields.entries()).map(([key, value]) => `\t"${key}" "${escapeVdf(value)}"`);
    return `"workshopitem"\n{\n${lines.join("\n")}\n}`;
}

export async function location(): Promise<string> {
    const platform = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'macos' : 'linux';
    if (platform === 'windows') {
        return path.resolve(os.tmpdir(), 'steamcmd', 'steamcmd.exe')
    } else if (platform === 'linux' || platform === 'macos') {
        return path.resolve(os.tmpdir(), 'steamcmd', 'steamcmd.sh')
    }

    throw new Error("Unsupported platform");
}

export async function publish(username: string, options: PublishOptions): Promise<string> {
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

    const vdf = workshopItemVdf(options);

    console.log(`Generating VDF:\n${vdf}`);

    const file = path.resolve(os.tmpdir(), 'addon.vdf');
    await writeFile(file, vdf);

    const code = await command(steamcmd, "+@ShutdownOnFailedCommand", "1", "+login", username, "+workshop_build_item", file, "+quit");
    if (code !== 0 && code !== 7) {
        throw new Error("Failed to publish addon");
    }

    // SteamCMD writes the new item's ID back into the VDF after creating it.
    const written = await readFile(file, "utf-8").catch(() => "");
    const id = /"publishedfileid"\s+"(\d+)"/i.exec(written)?.[1];
    return id && id !== "0" ? id : options.id || "";
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
    const platform = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'macos' : 'linux';

    if (platform === 'windows') {
        const output = path.resolve(os.tmpdir(), 'steamcmd');
    
        const files = await unzip("https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip", output);
    
        const executable = files.find(f => f.path === "steamcmd.exe");
    
        if (!executable) {
            throw new Error("Failed to find steamcmd executable");
        }
    
        return path.resolve(output, executable.path);
    } else if (platform === 'linux')  {
        const output = path.resolve(os.tmpdir(), 'steamcmd');
    
        const files = await unzip("https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz", output);
    
        const executable = files.find(f => f.path === "steamcmd.sh");
    
        if (!executable) {
            throw new Error("Failed to find steamcmd executable");
        }
    
        return path.resolve(output, executable.path);
    } else if (platform === 'macos') {
        const output = path.resolve(os.tmpdir(), 'steamcmd');
    
        const files = await unzip("https://steamcdn-a.akamaihd.net/client/installer/steamcmd_osx.tar.gz", output);
    
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
    const platform = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'macos' : 'linux';
    if (platform === 'windows') {
        let filepath = path.resolve(os.tmpdir(), 'steamcmd', 'config', 'config.vdf');
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
    } else if (platform === 'linux' || platform === 'macos') {
        let filepath = path.resolve(os.tmpdir(), 'steamcmd', 'config', 'config.vdf');
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
