import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, rm, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { DEFAULT_APPID, gameFor } from "../src/games/index.js";
import { checkSts2Mod, sts2 } from "../src/games/sts2.js";
import { DEFAULT_ICON } from "../src/steam.js";

describe("gameFor", () => {
    test("defaults to Garry's Mod for existing workflows", () => {
        expect(DEFAULT_APPID).toBe("4000");
        expect(gameFor("").name).toBe("Garry's Mod");
        expect(gameFor("4000").defaultIcon).toBe(DEFAULT_ICON);
    });

    test("picks Slay the Spire 2 by app ID", () => {
        const game = gameFor(" 2868840 ");
        expect(game).toBe(sts2);
        expect(game.defaultIcon).toBeUndefined();
    });

    test("uploads other games' folders as is", async () => {
        const game = gameFor("12345");
        expect(game.appid).toBe("12345");
        expect(game.defaultIcon).toBeUndefined();
        await expect(game.prepare("/some/folder")).resolves.toBe("/some/folder");
    });

    test("rejects app IDs that aren't numbers", () => {
        expect(() => gameFor("gmod")).toThrow(/Invalid appid/);
    });
});

describe("Slay the Spire 2 mod check", () => {
    let dir: string;

    beforeEach(async () => {
        dir = await mkdtemp(path.join(os.tmpdir(), "sts2-mod-"));
    });

    afterEach(async () => {
        await rm(dir, { recursive: true, force: true });
    });

    async function mod(folder: string, id: string, manifest: object, files: string[], name = `${id}.json`) {
        await mkdir(folder, { recursive: true });
        await writeFile(path.join(folder, name), JSON.stringify({ id, ...manifest }));
        for (const file of files) {
            await writeFile(path.join(folder, file), "");
        }
    }

    test("accepts a mod at the top level", async () => {
        await mod(dir, "MyMod", { has_dll: true, has_pck: true }, ["MyMod.dll", "MyMod.pck"]);
        expect(await checkSts2Mod(dir)).toEqual({ errors: [], warnings: [] });
        await expect(sts2.prepare(dir)).resolves.toBe(dir);
    });

    test("accepts several mods in subfolders", async () => {
        await mod(path.join(dir, "BaseLib"), "BaseLib", { has_dll: true, has_pck: true }, ["BaseLib.dll", "BaseLib.pck"]);
        await mod(path.join(dir, "BaseLib"), "BaseLibCompatibilityHelper", { has_dll: true, has_pck: false }, ["BaseLibCompatibilityHelper.dll"]);
        expect(await checkSts2Mod(dir)).toEqual({ errors: [], warnings: [] });
    });

    test("reads manifests that start with a BOM", async () => {
        await writeFile(path.join(dir, "MyMod.json"), "﻿" + JSON.stringify({ id: "MyMod", has_dll: true }));
        await writeFile(path.join(dir, "MyMod.dll"), "");
        expect(await checkSts2Mod(dir)).toEqual({ errors: [], warnings: [] });
    });

    test("ignores JSON files that aren't manifests", async () => {
        await mod(dir, "MyMod", { has_dll: true }, ["MyMod.dll"]);
        await writeFile(path.join(dir, "MyMod.settings.json"), JSON.stringify({ MaxPlayers: 8 }));
        await writeFile(path.join(dir, "broken.json"), "{ not json");
        expect(await checkSts2Mod(dir)).toEqual({ errors: [], warnings: [] });
    });

    test("reports a manifest not named after its id", async () => {
        await mod(dir, "MyMod", { has_dll: true }, ["MyMod.dll"], "mod.json");
        const { errors } = await checkSts2Mod(dir);
        expect(errors).toEqual([`mod.json: the file must be named after the mod's id ("MyMod.json").`]);
    });

    test("reports a missing dll or pck", async () => {
        await mod(dir, "MyMod", { has_dll: true, has_pck: true }, []);
        const { errors } = await checkSts2Mod(dir);
        expect(errors).toEqual([
            "MyMod.json: has_dll is true, but MyMod.dll is missing.",
            "MyMod.json: has_pck is true, but MyMod.pck is missing.",
        ]);
        await expect(sts2.prepare(dir)).rejects.toThrow(/The mod folder isn't valid/);
    });

    test("only warns when there is no manifest", async () => {
        await writeFile(path.join(dir, "settings.json"), JSON.stringify({ MaxPlayers: 8 }));
        const { errors, warnings } = await checkSts2Mod(dir);
        expect(errors).toEqual([]);
        expect(warnings).toHaveLength(1);
        await expect(sts2.prepare(dir)).resolves.toBe(dir);
    });
});
