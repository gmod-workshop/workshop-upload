import { gmod } from "./gmod.js";
import { sts2 } from "./sts2.js";
import type { GameProfile } from "./profile.js";

export type { GameProfile } from "./profile.js";

/**
 * Games with special handling, by app ID. To add one, write a profile and list it here.
 */
export const GAMES: readonly GameProfile[] = [gmod, sts2];

/**
 * The default app ID, kept for compatibility with workflows written before `appid` existed.
 */
export const DEFAULT_APPID = gmod.appid;

/**
 * The profile for an app ID. Games without one upload the folder as is.
 */
export function gameFor(appid: string): GameProfile {
    const id = appid.trim() || DEFAULT_APPID;
    if (!/^\d+$/.test(id)) {
        throw new Error(`Invalid appid "${appid}": expected a Steam app ID such as ${DEFAULT_APPID}.`);
    }

    return GAMES.find((game) => game.appid === id) ?? {
        name: `Steam app ${id}`,
        appid: id,
        async prepare(folder) {
            return folder;
        },
    };
}
