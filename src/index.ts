import { getInput } from "@actions/core";
import * as steam from "./steam.js";
import * as gmad from "./gmad.js";

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

    await steam.download();
    await steam.update();
    await steam.login(username, { password, totp, vdf });

    await gmad.download();
    const folder = await gmad.create(dir, './output/addon.gma');

    await steam.publish(username, {
        id,
        appid: "4000",
        changelog,
        icon,
        folder,
        title,
        description,
    });
}

run();
