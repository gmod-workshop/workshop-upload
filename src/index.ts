import core from "@actions/core";
import { Workshop } from "./workshop";

async function run() {
    const username = core.getInput('username', { required: true });
    const password = core.getInput('password');
    const totp = core.getInput('totp');
    const vdf = core.getInput('vdf');

    if (!password && !totp && !vdf) {
        throw new Error('No login method provided');
    }

    const id = core.getInput('id', { required: true });
    const changelog = core.getInput('changelog');
    const icon = core.getInput('icon');
    const dir = core.getInput('dir', { required: true });

    const workshop = new Workshop();
    await workshop.publish({ username, password, totp, vdf, addon: { id, changelog, icon, dir } });
}

run();
