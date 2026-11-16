import { readdir, readFile } from "fs/promises";
import path from "path";
import type { GameProfile } from "./profile.js";

/**
 * A Slay the Spire 2 mod manifest (`<id>.json`). Only the fields checked here.
 */
interface Sts2Manifest {
    id: string;
    has_dll?: boolean;
    has_pck?: boolean;
}

function isManifest(value: unknown): value is Sts2Manifest {
    return typeof value === "object" && value !== null
        && typeof (value as Sts2Manifest).id === "string"
        && ("has_dll" in value || "has_pck" in value);
}

/**
 * Find the mod manifests in a Workshop folder: at the top level (`<id>.json`) or one folder down
 * (`<Mod>/<id>.json`), which is how items bundling several mods are laid out.
 * @returns Absolute paths of the manifests, with their contents.
 */
export async function findSts2Manifests(folder: string): Promise<{ file: string, manifest: Sts2Manifest }[]> {
    const found: { file: string, manifest: Sts2Manifest }[] = [];
    const dirs = [folder];
    for (const entry of await readdir(folder, { withFileTypes: true })) {
        if (entry.isDirectory()) {
            dirs.push(path.join(folder, entry.name));
        }
    }

    for (const dir of dirs) {
        for (const entry of await readdir(dir, { withFileTypes: true })) {
            if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== ".json") {
                continue;
            }

            const file = path.join(dir, entry.name);
            let json: unknown;
            try {
                // Manifests saved by Windows editors often start with a BOM.
                json = JSON.parse((await readFile(file, "utf-8")).replace(/^﻿/, ""));
            } catch {
                continue;
            }

            if (isManifest(json)) {
                found.push({ file, manifest: json });
            }
        }
    }

    return found;
}

/**
 * Check that each manifest matches its files: the file is named `<id>.json`, and `<id>.dll` / `<id>.pck`
 * sit next to it when `has_dll` / `has_pck` say so.
 * @returns Problems found, empty when the folder looks right.
 */
export async function checkSts2Mod(folder: string): Promise<{ errors: string[], warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const manifests = await findSts2Manifests(folder);

    if (manifests.length === 0) {
        warnings.push(`No mod manifest found in ${folder}. A Slay the Spire 2 mod needs <id>.json (with id, has_dll and has_pck) next to its .dll and .pck.`);
    }

    for (const { file, manifest } of manifests) {
        const dir = path.dirname(file);
        const name = path.relative(folder, file);
        const files = new Set(await readdir(dir));

        if (path.basename(file, ".json") !== manifest.id) {
            errors.push(`${name}: the file must be named after the mod's id ("${manifest.id}.json").`);
        }
        if (manifest.has_dll && !files.has(`${manifest.id}.dll`)) {
            errors.push(`${name}: has_dll is true, but ${manifest.id}.dll is missing.`);
        }
        if (manifest.has_pck && !files.has(`${manifest.id}.pck`)) {
            errors.push(`${name}: has_pck is true, but ${manifest.id}.pck is missing.`);
        }
    }

    return { errors, warnings };
}

/**
 * Slay the Spire 2: the mod folder (`<id>.json`, `<id>.dll`, `<id>.pck`) is uploaded as is, after a check that
 * its manifests match its files.
 */
export const sts2: GameProfile = {
    name: "Slay the Spire 2",
    appid: "2868840",
    async prepare(folder) {
        const { errors, warnings } = await checkSts2Mod(folder);
        warnings.forEach((warning) => console.warn(`Warning: ${warning}`));
        if (errors.length > 0) {
            throw new Error(`The mod folder isn't valid:\n${errors.map((error) => `  - ${error}`).join("\n")}`);
        }
        return folder;
    },
};
