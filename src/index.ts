import { getInput, setFailed, setOutput } from "@actions/core";
import path from "path";
import * as steam from "./steam.js";
import * as bbcode from "./bbcode.js";
import { gameFor } from "./games/index.js";

async function run() {
    const username = getInput('username', { required: true, trimWhitespace: true });
    const password = getInput('password', { trimWhitespace: true });
    const totp = getInput('totp', { trimWhitespace: true });
    const vdf = getInput('vdf');

    if (!password && !totp && !vdf) {
        throw new Error('No login method provided');
    }

    const game = gameFor(getInput('appid', { trimWhitespace: true }));
    console.log(`Game: ${game.name} (app ${game.appid})`);

    const id = getInput('id', { trimWhitespace: true });

    const title = getInput('title', { trimWhitespace: true });
    const iconInput = getInput('icon', { trimWhitespace: true });
    // New items get the game's default preview image, if it has one.
    const icon = iconInput ? path.resolve(iconInput) : (id ? undefined : game.defaultIcon);

    const description = getInput('description', { trimWhitespace: false });
    const markdownDescription = getInput('markdown-description');

    if (description && markdownDescription) {
        throw new Error('Cannot provide both description and markdown-description');
    }

    let realDescription = description;
    if (!description && markdownDescription) {
        realDescription = await bbcode.convert(markdownDescription);
    }

    const visibility = steam.parseVisibility(getInput('visibility'));

    const changelog = getInput('changelog');
    const markdownChangelog = getInput('markdown-changelog');

    if (changelog && markdownChangelog) {
        throw new Error('Cannot provide both changelog and markdown-changelog');
    }

    let realChangelog = changelog;
    if (!changelog && markdownChangelog) {
        realChangelog = await bbcode.convert(markdownChangelog);
    }

    const dir = path.resolve(getInput('folder', { required: true }));

    // Check the folder before spending time on SteamCMD.
    const folder = await game.prepare(dir);

    console.log('Downloading SteamCMD...');
    await steam.download();
    console.log('Updating SteamCMD...');
    await steam.update();
    console.log('Logging in to Steam...');
    await steam.login(username, { password, totp, vdf });

    console.log('Publishing...');
    const publishedId = await steam.publish(username, {
        id,
        appid: game.appid,
        changelog: realChangelog,
        icon,
        folder,
        title,
        description: realDescription,
        visibility,
    });

    if (publishedId) {
        setOutput('id', publishedId);
        console.log(`Published https://steamcommunity.com/sharedfiles/filedetails/?id=${publishedId}`);
    }

    console.log('Done!');
}

run().catch((error) => {
    setFailed(error instanceof Error ? error.message : String(error));
});
