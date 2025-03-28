import decompress from "decompress";
import get from "download";
import { access, readFile, writeFile } from "fs/promises";
import path from "path";
import { command } from "./command";
import { convert } from "./bbcode";

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

export async function publish(username: string, options: PublishOptions): Promise<void> {
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

    await writeFile('addon.vdf', vdf.trim());

    const code = await command("./steamcmd/steamcmd.exe", "+@ShutdownOnFailedCommand", "1", "+login", username, "+workshop_build_item", path.resolve('./addon.vdf'), "+quit");
    if (code !== 0 && code !== 7) {
        throw new Error("Failed to publish addon");
    }
}

export async function authenticated(username: string): Promise<boolean> {
    const exists = await access("./steamcmd/steamcmd.exe").then(() => true, () => false);
    if (!exists) {
        return false;
    }

    try {
        const config = await readFile("./steamcmd/config/config.vdf", "utf-8");
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
    const exists = await access("./steamcmd/steamcmd.exe").then(() => true, () => false);
    if (!exists) {
        await download();
    }

    const { password, totp, vdf } = credentials;

    if (totp) {
        if (!password) {
            throw new Error("TOTP requires a password");
        }

        const code = await command("./steamcmd/steamcmd.exe", "+@ShutdownOnFailedCommand", "1", "+set_steam_guard_code", totp, "+login", username, password, "+quit");
        if (code !== 0 && code !== 7) {
            throw new Error("Failed to login to Steam");
        }
    } else if (password) {
        const code = await command("./steamcmd/steamcmd.exe", "+@ShutdownOnFailedCommand", "1", "+login", username, password, "+quit");
        if (code !== 0 && code !== 7) {
            throw new Error("Failed to login to Steam");
        }
    } else if (vdf) {
        const code = await command("./steamcmd/steamcmd.exe", "+@ShutdownOnFailedCommand", "1", "+login", username, "+quit");
        if (code !== 0 && code !== 7) {
            throw new Error("Failed to login to Steam");
        }
    } else {
        if (await authenticated(username)) {
            return;
        }

        throw new Error("No login method provided");
    }
}

/**
 * Update SteamCMD. This does not require login.
 */
export async function update(): Promise<void> {
    const exits = await access("./steamcmd/steamcmd.exe").then(() => true, () => false);
    if (!exits) {
        await download();
    }

    const code = await command("./steamcmd/steamcmd.exe", "+@ShutdownOnFailedCommand", "1", "+login", "anonymous", "+quit");
    if (code !== 0 && code !== 7) {
        throw new Error("Failed to update SteamCMD");
    }
}

export async function download(): Promise<string> {
    const data = await get("https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip");

    const files = await decompress(data, "./steamcmd");

    const executable = files.find(f => f.path === "steamcmd.exe");

    if (!executable) {
        throw new Error("Failed to find steamcmd executable");
    }

    return path.resolve("./steamcmd", executable.path);
}
