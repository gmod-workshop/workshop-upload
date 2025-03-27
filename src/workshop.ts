import * as fs from "fs/promises";
import download from "download";
import decompress from "decompress";
import path from "path";
import { spawn } from "child_process";

interface WorkshopOptions {
    username: string;
    password?: string;
    totp?: string;
    vdf?: string;

    addon: { id: string; changelog?: string; icon?: string; dir: string; };
}

export class Workshop {
    public static STEAMCMD_URL = "https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip";

    public async publish(options: WorkshopOptions) {
        const [steamcmd] = await this.unzip(Workshop.STEAMCMD_URL, "./steamcmd");

        await this.update(steamcmd.path);

        await this.login(steamcmd.path, options.username, { password: options.password, totp: options.totp, vdf: options.vdf });

        const os = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'macos' : 'linux';
        const [gmad] = await this.unzip(`https://github.com/WilliamVenner/fastgmad/releases/latest/download/fastgmad_${os}.zip`, "./gmad");

        await this.pack(gmad.path, options.addon.dir);

        await this.upload(steamcmd.path, {
            username: options.username,
            id: options.addon.id,
            changelog: options.addon.changelog,
            icon: options.addon.icon,
            dir: './output',
        });
    }

    private async pack(gmad: string, dir: string) {
        console.log('Packaging addon');
    
        await fs.mkdir('./output', { recursive: true });
    
        const code = await this.command(gmad, 'create', '-folder', dir, '-out', './output/addon.gma');
        if (code !== 0) {
            throw new Error('Failed to package addon');
        }
    
        console.log('\tAddon packaged!');
    }


    private async upload(steamcmd: string, { username, id, changelog, icon, dir }: { username: string, id?: string, changelog?: string, icon?: string, dir: string }) {
        console.log('Publishing addon to Steam Workshop');
        
            const vdf = ['"workshopitem"\n', "{"];
            vdf.push(`\t"appid" "4000"`);
            vdf.push(`\t"contentfolder" "${path.resolve(dir, './addon.gma')}"`);
            if (id) {
                console.log('\tUpdating existing addon');
        
                vdf.push(`\t"publishedfileid" "${id}"`);
            } else {
                console.log('\tCreating new addon');
            }
            if (changelog) {
                vdf.push(`\t"changenote" "${changelog.replace('\"', "")}"`);
            }
            if (icon) {
                vdf.push(`\t"previewfile" "${icon}"`);
            } else {
                if (id) {
                    console.log('\tNo icon provided, using existing icon');
                } else {
                    console.log('\tNo icon provided, using default icon');
                    vdf.push(`\t"previewfile" "default_icon.png"`);
                }
            }
            vdf.push("}");
        
            await fs.writeFile('addon.vdf', vdf.join('\n'));
        
            const code = await this.command(steamcmd, '+@ShutdownOnFailedCommand', '1', '+login', username, '+workshop_build_item', path.resolve('./addon.vdf'), '+quit');
        
            if (code !== 0 && code !== 7) {
                throw new Error('Failed to publish addon');
            }
        
            console.log('\tAddon published!');
    }

    private async login(steamcmd: string, username: string, { password, totp, vdf }: { password?: string, totp?: string, vdf?: string } = {}) {
        console.log('Logging into Steam');

        let code: number|null = null;

        if (totp) {
            console.log('\tLogging into Steam using TOTP');

            if (!password) {
                throw new Error('TOTP requires a password');
            }

            code = await this.command(steamcmd, '+@ShutdownOnFailedCommand', '1', '+set_steam_guard_code', totp, '+login', username, password, '+quit');
        } else if (password) {
            console.log('\tLogging into Steam using password');

            code = await this.command(steamcmd, '+@ShutdownOnFailedCommand', '1', '+login', username, password, '+quit');
        } else if (vdf) {
            console.log('\tLogging into Steam using VDF');

            const path = steamcmd.split('/').slice(0, -1).join('/');
            await fs.mkdir(`${path}/config`, { recursive: true });
            await fs.writeFile(`${path}/config/config.vdf`, Buffer.from(vdf, 'base64'));

            code = await this.command(steamcmd, '+@ShutdownOnFailedCommand', '1', '+login', username, '+quit');
        } else {
            // Check if account exists in config.vdf before throwing error
            const path = steamcmd.split('/').slice(0, -1).join('/');
            const configPath = `${path}/config/config.vdf`;
            
            const configContent = await fs.readFile(configPath, 'utf-8');
            const accountExists = configContent.includes(`"${username}"`);
            
            if (!accountExists) {
                throw new Error('No login method provided and account not found in config.vdf');
            }
            
            console.log('\tLogging into Steam using existing credentials');
            code = await this.command(steamcmd, '+@ShutdownOnFailedCommand', '1', '+login', username, '+quit');
        }

        if (code !== 0 && code !== 7) {
            throw new Error('Failed to login to Steam');
        }

        console.log('\tLogged in!');
    }


    private async unzip(url: string, path: string) {
        console.log(`Downloading: ${url}`);
    
        const data = await download(url);
    
        const files = await decompress(data, path);
    
        return files.map(f => ({ path: `${path}/${f.path}`, type: f.type }));
    }

    private async update(steamcmd: string) {
        console.log('Updating SteamCMD');
        const code = await this.command(steamcmd, '+@ShutdownOnFailedCommand', '1', '+login', 'anonymous', '+quit');
        if (code !== 0 && code !== 7) {
            console.log(`Failed to update SteamCMD with code ${code}`);
            throw new Error('Failed to update SteamCMD');
        }
        console.log('\tSteamCMD updated!');
    }

    private async command(...args: string[]): Promise<number|null> {
        const process = spawn(args[0], args.slice(1), {
            stdio: "inherit",
        });

        return new Promise((resolve, reject) => {
            process.on('error', reject);
            process.on('exit', resolve);
        })
    }
}
