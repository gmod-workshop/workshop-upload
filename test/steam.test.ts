import { describe, test, expect, vi, beforeEach } from "vitest";
import * as steam from "../src/steam.js";
import { command } from "../src/command.js";
import get from "download";
import decompress from "decompress";
import { access, readFile, writeFile } from "fs/promises";

// Mock external dependencies
vi.mock("download", () => ({
    default: vi.fn()
}));

vi.mock("decompress", () => ({
    default: vi.fn()
}));

vi.mock("../src/command.js", () => ({
    command: vi.fn()
}));

vi.mock("fs/promises", () => ({
    access: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn()
}));

describe("Steam", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test("Downloads SteamCMD", async () => {
        // Mock download response
        const mockDownloadData = Buffer.from("fake-steamcmd-data");
        (get as any).mockResolvedValue(mockDownloadData);

        // Mock decompress response
        (decompress as any).mockResolvedValue([
            { path: "steamcmd.exe" }
        ]);

        const result = await steam.download();
        
        expect(get).toHaveBeenCalledWith(expect.stringContaining("steamcmd"));
        expect(decompress).toHaveBeenCalledWith(mockDownloadData, expect.any(String));
        expect(result).toContain("steamcmd");
    });

    test("Authenticates user successfully", async () => {
        // Mock file access and reading
        (access as any).mockResolvedValue(true);
        (readFile as any).mockResolvedValue('{"users": {"testuser": {}}}');

        const isAuthenticated = await steam.authenticated("testuser");
        
        expect(isAuthenticated).toBe(true);
        expect(readFile).toHaveBeenCalled();
    });

    test("Login with password succeeds", async () => {
        // Mock successful command execution
        (command as any).mockResolvedValue(0);
        
        await expect(steam.login("testuser", { password: "testpass" }))
            .resolves.not.toThrow();
        
        expect(command).toHaveBeenCalledWith(
            expect.any(String),
            "+@ShutdownOnFailedCommand",
            "1",
            "+login",
            "testuser",
            "testpass",
            "+quit"
        );
    });

    test("Publish fails without authentication", async () => {
        // Mock unauthenticated state
        (access as any).mockResolvedValue(true);
        (readFile as any).mockResolvedValue("{}");

        await expect(steam.publish("testuser", {
            appid: "4000",
            folder: "/absolute/path"
        })).rejects.toThrow("Not authenticated");
    });
});
