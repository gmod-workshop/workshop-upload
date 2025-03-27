import { program } from "commander";
import { Workshop } from "./workshop";

interface ProgramOptions {
    username: string;
    password?: string;
    totp?: string;
    vdf?: string;
    id: string;
    changelog?: string;
    icon?: string;
    dir: string;
}

async function run() {
    const command = await program
        .name('workshop-upload')
        .requiredOption('-u, --username <username>', 'Steam username', process.env.STEAM_USERNAME)
        .option('-p, --password <password>', 'Steam password', process.env.STEAM_PASSWORD)
        .option('-g, --totp <totp>', 'Steam TOTP code', process.env.STEAM_TOTP)
        .option('-v, --vdf <vdf>', 'Steam account VDF', process.env.STEAM_VDF)
        .requiredOption('-i, --id <id>', 'Addon ID', process.env.ADDON_ID)
        .option('-c, --changelog <changelog>', 'Addon changelog', process.env.ADDON_CHANGELOG)
        .option('-t, --icon <icon>', 'Addon icon', process.env.ADDON_ICON)
        .requiredOption('-d, --dir <path>', 'Addon directory', process.env.ADDON_DIR)
        .parseAsync(process.argv);

    const { username, password, totp, vdf, id, changelog, icon, dir } = command.opts<ProgramOptions>();

    const workshop = new Workshop();
    await workshop.publish({ username, password, totp, vdf, addon: { id, changelog, icon, dir } });
}

run();
