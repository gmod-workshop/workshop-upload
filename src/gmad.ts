import { access, mkdir } from "fs/promises";
import decompress from "decompress";
import path from "path";
import get from "download";
import { command } from "./command.js";

/**
 * Create a GMA file for an addon.
 * @param dir The directory to create the addon from.
 * @param out The directory to output the addon to.
 * @returns The absolute path to the addon.
 */
export async function create(dir: string, out: string): Promise<string> {
    const gmad = await location();
    const exists = await access(gmad).then(() => true, () => false);
    if (!exists) {
        await download();
    }

    await mkdir(out, { recursive: true });

    const code = await command(gmad, "create", "-warninvalid", "-folder", dir, "-out", out);
    if (code !== 0) {
        throw new Error("Failed to create addon");
    }

    return path.resolve(out);
}

/**
 * Download gmad
 * @returns The absolute path to the gmad executable.
 */
export async function download(): Promise<string> {
    const os = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'macos' : 'linux';

    const data = await get(`https://github.com/WilliamVenner/fastgmad/releases/latest/download/fastgmad_${os}.zip`);

    const output = path.resolve(process.cwd(), "gmad");

    const files = await decompress(data, output);

    const executable = files.find(f => f.path.startsWith("fastgmad") && !f.path.includes(".dll") && !f.path.includes(".so"));

    if (!executable) {
        throw new Error("Failed to find gmad executable");
    }

    return path.resolve(output, executable.path);
}

export async function location(): Promise<string> {
    const os = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'macos' : 'linux';
    if (os === 'windows') {
        return path.resolve(process.cwd(), "gmad", "fastgmad.exe");
    } else if (os === 'linux') {
        return path.resolve(process.cwd(), "gmad", "fastgmad");
    } else if (os === 'macos') {
        return path.resolve(process.cwd(), "gmad", "fastgmad");
    }

    throw new Error("Unsupported platform");
}
