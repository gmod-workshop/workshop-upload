import { getInput } from "@actions/core";
import * as steam from "./steam.js";
import * as gmad from "./gmad.js";
import path from "path";

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
    const description = getInput('description', { trimWhitespace: false });
    const icon = getInput('icon', { trimWhitespace: true });

    const changelog = getInput('changelog');
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
    const addon = await gmad.create(dir, path.resolve('output/addon.gma'));
    const folder = path.dirname(addon);

    console.log('Publishing addon...');
    await steam.publish(username, {
        id,
        appid: "4000",
        changelog,
        icon,
        folder,
        title,
        description,
    });

    console.log('Done!');
}

run();
