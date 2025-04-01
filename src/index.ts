import { getInput } from "@actions/core";
import path from "path";
import os from "os";
import * as steam from "./steam.js";
import * as gmad from "./gmad.js";
import * as bbcode from "./bbcode.js";

async function run() {
    const username = getInput('username', { required: true, trimWhitespace: true });
    const password = getInput('password', { trimWhitespace: true });
    const totp = getInput('totp', { trimWhitespace: true });
    const vdf = getInput('vdf');

    if (!password && !totp && !vdf) {
        throw new Error('No login method provided');
    }

    const id = getInput('id', { required: false, trimWhitespace: true });

    const title = getInput('title', { trimWhitespace: true });
    const icon = getInput('icon', { trimWhitespace: true });

    const description = getInput('description', { trimWhitespace: false });
    const markdownDescription = getInput('markdown-description');

    if (description && markdownDescription) {
        throw new Error('Cannot provide both description and markdown-description');
    }

    let realDescription = description;
    if (!description && markdownDescription) {
        realDescription = await bbcode.convert(markdownDescription);
    }

    const visibility = getInput('visibility', { trimWhitespace: true });

    const changelog = getInput('changelog');
    const markdownChangelog = getInput('markdown-changelog');

    let realChangelog = changelog;
    if (!changelog && markdownChangelog) {
        realChangelog = await bbcode.convert(markdownChangelog);
    }

    if (changelog && markdownChangelog) {
        throw new Error('Cannot provide both changelog and markdown-changelog');
    }

    const dir = getInput('folder', { required: true });

    console.log('Downloading SteamCMD...');
    await steam.download();
    console.log('Updating SteamCMD...');
    await steam.update();
    console.log('Logging in to Steam...');
    await steam.login(username, { password, totp, vdf });

    console.log('Downloading gmad...');
    await gmad.download();
    console.log('Creating addon...');
    const addon = await gmad.create(dir, path.resolve(os.tmpdir(), 'addon', 'addon.gma'));
    const folder = path.dirname(addon);

    console.log('Publishing addon...');
    await steam.publish(username, {
        id,
        appid: "4000",
        changelog: realChangelog,
        icon,
        folder,
        title,
        description: realDescription,
        visibility: parseInt(visibility),
    });

    console.log('Done!');
}

run();
