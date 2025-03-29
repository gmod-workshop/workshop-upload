import { program } from "commander";
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
        .requiredOption('--folder <path>', 'Addon directory', process.env.ADDON_DIR)
        .parseAsync(process.argv);

    const { username, password, totp, vdf, id, changelog, icon, folder: dir, title, description } = command.opts<ProgramOptions>();

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
