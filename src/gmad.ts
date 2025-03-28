import { access, mkdir } from "fs/promises";
import decompress from "decompress";
import path from "path";
import get from "download";
import { command } from "./command";

/**
 * Create a GMA file for an addon.
 * @param dir The directory to create the addon from.
 * @param out The directory to output the addon to.
 * @returns The absolute path to the addon.
 */
export async function create(dir: string, out: string): Promise<string> {
    const exists = await access("./gmad/fastgmad.exe").then(() => true, () => false);
    if (!exists) {
        await download();
    }

    await mkdir(out, { recursive: true });

    const code = await command("./gmad/fastgmad.exe", "create", "-folder", dir, "-out", out);
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

    const files = await decompress(data, "./gmad");

    const executable = files.find(f => f.path === "fastgmad.exe");

    if (!executable) {
        throw new Error("Failed to find gmad executable");
    }

    return path.resolve("./gmad", executable.path);
}
