import { spawn } from "child_process";

export async function command(...args: string[]): Promise<number|null> {
    const process = spawn(args[0], args.slice(1), {
        stdio: "inherit",
    });

    return new Promise((resolve, reject) => {
        process.on('error', reject);
        process.on('exit', resolve);
    })
}
