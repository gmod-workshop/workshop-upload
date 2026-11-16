import { describe, test, expect } from "vitest";
import { existsSync } from "fs";
import { DEFAULT_ICON, parseVisibility, vdfString, workshopItemVdf } from "../src/steam.js";

describe("parseVisibility", () => {
    test("leaves visibility unchanged when empty", () => {
        expect(parseVisibility(undefined)).toBeUndefined();
        expect(parseVisibility("")).toBeUndefined();
        expect(parseVisibility("  ")).toBeUndefined();
    });

    test("accepts names", () => {
        expect(parseVisibility("public")).toBe(0);
        expect(parseVisibility("friends_only")).toBe(1);
        expect(parseVisibility("Friends-Only")).toBe(1);
        expect(parseVisibility("private")).toBe(2);
        expect(parseVisibility(" UNLISTED ")).toBe(3);
    });

    test("accepts numbers, including 0 (public)", () => {
        expect(parseVisibility("0")).toBe(0);
        expect(parseVisibility("3")).toBe(3);
    });

    test("rejects anything else", () => {
        expect(() => parseVisibility("hidden")).toThrow(/Invalid visibility/);
        expect(() => parseVisibility("4")).toThrow(/Invalid visibility/);
        expect(() => parseVisibility("1.5")).toThrow(/Invalid visibility/);
    });
});

// SteamCMD doesn't read escape sequences in workshop_build_item files, so `\"` breaks parsing.
describe("vdfString", () => {
    test("turns quoted text into typographic quotes", () => {
        expect(vdfString('say "hi" and "bye"')).toBe("say \u201Chi\u201D and \u201Cbye\u201D");
    });

    test("turns any other double quote into a closing quote", () => {
        expect(vdfString('12" vinyl')).toBe("12\u201D vinyl");
        expect(vdfString('"open\nline')).toBe("\u201Dopen\nline");
    });

    test("never leaves a double quote", () => {
        expect(vdfString('a"b"c"d\\"')).not.toContain('"');
    });

    test("writes backslashes and line breaks as is", () => {
        expect(vdfString("C:\\Temp\\new\\test")).toBe("C:\\Temp\\new\\test");
        expect(vdfString("Line 1\nLine 2")).toBe("Line 1\nLine 2");
    });
});

describe("workshopItemVdf", () => {
    test("creates a new item when there is no ID", () => {
        expect(workshopItemVdf({ appid: "4000", folder: "/tmp/addon" })).toBe(
            '"workshopitem"\n{\n\t"appid" "4000"\n\t"contentfolder" "/tmp/addon"\n\t"publishedfileid" "0"\n}'
        );
        expect(workshopItemVdf({ appid: "4000", folder: "/tmp/addon", id: "" })).toContain('"publishedfileid" "0"');
    });

    test("writes public visibility (0)", () => {
        expect(workshopItemVdf({ appid: "4000", folder: "/tmp/addon", visibility: 0 })).toContain('"visibility" "0"');
    });

    test("leaves out fields that weren't given", () => {
        const vdf = workshopItemVdf({ appid: "4000", folder: "/tmp/addon", id: "123" });
        for (const key of ["visibility", "title", "description", "changenote", "previewfile"]) {
            expect(vdf).not.toContain(`"${key}"`);
        }
    });

    test("makes every value safe", () => {
        const vdf = workshopItemVdf({
            appid: "4000",
            id: "123",
            folder: "C:\\Temp\\addon",
            icon: "C:\\Temp\\icon.png",
            title: 'The "Best" Addon',
            description: "Line 1\nLine 2 with a \\ backslash",
            changelog: 'Fixed "quotes"',
        });

        expect(vdf).toContain('"contentfolder" "C:\\Temp\\addon"');
        expect(vdf).toContain('"previewfile" "C:\\Temp\\icon.png"');
        expect(vdf).toContain('"title" "The \u201CBest\u201D Addon"');
        expect(vdf).toContain('"description" "Line 1\nLine 2 with a \\ backslash"');
        expect(vdf).toContain('"changenote" "Fixed \u201Cquotes\u201D"');
        // Every line is "key" "value": exactly four double quotes.
        for (const line of vdf.split("\n").filter((l) => l.startsWith("\t\"") && !l.includes("description"))) {
            expect(line.match(/"/g)).toHaveLength(4);
        }
    });
});

test("the default icon ships with the action", () => {
    expect(existsSync(DEFAULT_ICON)).toBe(true);
});
