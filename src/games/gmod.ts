import path from "path";
import os from "os";
import * as gmad from "../gmad.js";
import { DEFAULT_ICON } from "../steam.js";
import type { GameProfile } from "./profile.js";

/**
 * Garry's Mod: the addon folder is packed into a .gma with gmad, and that is what gets uploaded.
 */
export const gmod: GameProfile = {
    name: "Garry's Mod",
    appid: "4000",
    defaultIcon: DEFAULT_ICON,
    async prepare(folder) {
        console.log('Downloading gmad...');
        await gmad.download();
        console.log('Creating addon...');
        const addon = await gmad.create(folder, path.resolve(os.tmpdir(), 'addon', 'addon.gma'));
        return path.dirname(addon);
    },
};
