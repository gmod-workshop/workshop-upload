/**
 * How to upload Workshop items for one game.
 */
export interface GameProfile {
    /** Shown in logs. */
    name: string;
    /** The game's Steam app ID. */
    appid: string;
    /**
     * Check the user's folder and turn it into the folder SteamCMD uploads (for example by packing it).
     * @param folder Absolute path to the user's folder.
     * @returns Absolute path to the folder to upload.
     */
    prepare(folder: string): Promise<string>;
    /** Preview image for new items when no icon is given. */
    defaultIcon?: string;
}
