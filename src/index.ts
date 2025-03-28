import core from "@actions/core";
import * as steam from "./steam";
import * as gmad from "./gmad";

async function run() {
    const username = core.getInput('username', { required: true, trimWhitespace: true });
    const password = core.getInput('password', { trimWhitespace: true });
    const totp = core.getInput('totp', { trimWhitespace: true });
    const vdf = core.getInput('vdf');

    if (!password && !totp && !vdf) {
        throw new Error('No login method provided');
    }

    const id = core.getInput('id', { required: false, trimWhitespace: true });

    const title = core.getInput('title', { trimWhitespace: true });
    const description = core.getInput('description', { trimWhitespace: false });
    const icon = core.getInput('icon', { trimWhitespace: true });

    const changelog = core.getInput('changelog');
    const dir = core.getInput('folder', { required: true });

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
