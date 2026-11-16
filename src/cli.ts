#!/usr/bin/env node

import { program } from "commander";
import path from "path";
import * as steam from "./steam.js";
import * as gmad from "./gmad.js";

interface ProgramOptions {
    username: string;

    password?: string;
    totp?: string;
    vdf?: string;

    id?: string;

    icon?: string;
    title?: string;
    description?: string;
    visibility?: string;

    changelog?: string;
    folder: string;
}

async function run() {
    const command = await program
        .name('workshop-upload')
        .requiredOption('-u, --username <username>', 'Steam username', process.env.STEAM_USERNAME)
        .option('-p, --password <password>', 'Steam password', process.env.STEAM_PASSWORD)
        .option('--totp <totp>', 'Steam TOTP code', process.env.STEAM_TOTP)
        .option('--vdf <vdf>', 'Steam account VDF', process.env.STEAM_VDF)
        .option('-i, --id <id>', 'Addon ID', process.env.ADDON_ID)
        .option('--changelog <changelog>', 'Addon changelog', process.env.ADDON_CHANGELOG)
        .option('--icon <icon>', 'Addon icon', process.env.ADDON_ICON)
        .option('--title <title>', 'Addon title', process.env.ADDON_TITLE)
        .option('--description <description>', 'Addon description', process.env.ADDON_DESCRIPTION)
        .option('--visibility <visibility>', 'public, friends_only, private or unlisted', process.env.ADDON_VISIBILITY)
        .requiredOption('--folder <path>', 'Addon directory', process.env.ADDON_DIR)
        .parseAsync(process.argv);

    const { username, password, totp, vdf, id, changelog, icon, folder: dir, title, description, visibility } = command.opts<ProgramOptions>();

    await steam.download();
    await steam.update();
    await steam.login(username, { password, totp, vdf });

    await gmad.download();
    const addon = await gmad.create(path.resolve(dir), path.resolve('output', 'addon.gma'));

    const publishedId = await steam.publish(username, {
        id,
        appid: "4000",
        changelog,
        icon: icon ? path.resolve(icon) : (id ? undefined : steam.DEFAULT_ICON),
        folder: path.dirname(addon),
        title,
        description,
        visibility: steam.parseVisibility(visibility),
    });

    if (publishedId) {
        console.log(`Published https://steamcommunity.com/sharedfiles/filedetails/?id=${publishedId}`);
    }
}

run().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
