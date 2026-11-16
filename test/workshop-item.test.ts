import { describe, test, expect } from "vitest";
import { existsSync } from "fs";
import { DEFAULT_ICON, escapeVdf, parseVisibility, workshopItemVdf } from "../src/steam.js";

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

describe("escapeVdf", () => {
    test("escapes backslashes and quotes", () => {
        expect(escapeVdf('say "hi"')).toBe('say \\"hi\\"');
        expect(escapeVdf("C:\\Users\\runneradmin")).toBe("C:\\\\Users\\\\runneradmin");
        expect(escapeVdf('\\"')).toBe('\\\\\\"');
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

    test("escapes every value", () => {
        const vdf = workshopItemVdf({
            appid: "4000",
            id: "123",
            folder: "C:\\Temp\\addon",
            icon: "C:\\Temp\\icon.png",
            title: 'The "Best" Addon',
            description: "Line 1\nLine 2 with a \\ backslash",
            changelog: 'Fixed "quotes"',
        });

        expect(vdf).toContain('"contentfolder" "C:\\\\Temp\\\\addon"');
        expect(vdf).toContain('"previewfile" "C:\\\\Temp\\\\icon.png"');
        expect(vdf).toContain('"title" "The \\"Best\\" Addon"');
        expect(vdf).toContain('"description" "Line 1\nLine 2 with a \\\\ backslash"');
        expect(vdf).toContain('"changenote" "Fixed \\"quotes\\""');
    });
});

test("the default icon ships with the action", () => {
    expect(existsSync(DEFAULT_ICON)).toBe(true);
});
