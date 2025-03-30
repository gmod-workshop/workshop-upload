import { access, mkdir } from "fs/promises";
import decompress from "decompress";
import path from "path";
import os from "os";
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

    const absolute = path.resolve(out)

    await mkdir(path.dirname(absolute), { recursive: true });

    const code = await command(gmad, "create", "-warninvalid", "-folder", dir, "-out", out);
    if (code !== 0) {
        throw new Error("Failed to create addon");
    }

    return absolute;
}

/**
 * Download gmad
 * @returns The absolute path to the gmad executable.
 */
export async function download(): Promise<string> {
    const platform = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'macos' : 'linux';

    const data = await get(`https://github.com/WilliamVenner/fastgmad/releases/latest/download/fastgmad_${platform}.zip`);

    const output = path.resolve(os.tmpdir(), "gmad");

    const files = await decompress(data, output);

    const executable = files.find(f => f.path.startsWith("fastgmad") && !f.path.includes(".dll") && !f.path.includes(".so"));

    if (!executable) {
        throw new Error("Failed to find gmad executable");
    }

    return path.resolve(output, executable.path);
}

export async function location(): Promise<string> {
    const platform = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'macos' : 'linux';
    if (platform === 'windows') {
        return path.resolve(os.tmpdir(), 'gmad', 'fastgmad.exe')
    } else if (platform === 'linux' || platform === 'macos') {
        return path.resolve(os.tmpdir(), 'gmad', 'fastgmad')
    }

    throw new Error("Unsupported platform");
}
