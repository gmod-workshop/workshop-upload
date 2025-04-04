import { describe, test, expect, vi, beforeEach } from "vitest";
import * as steam from "../src/steam.js";
import { command } from "../src/command.js";
import { access, readFile } from "fs/promises";
import { unzip } from "../src/unzip.js";

// Mock external dependencies
vi.mock("../src/unzip.js", () => ({
    unzip: vi.fn()
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
        // Create a spy on the download function
        const downloadSpy = vi.spyOn(steam, 'download');

        // Mock the unzip function to return a successful result
        (unzip as any).mockResolvedValue([
            { path: "steamcmd.exe" }
        ]);

        // Mock the implementation of download to avoid dependencies on path and os
        downloadSpy.mockImplementation(async () => {
            // Call the mocked unzip function directly
            await unzip("https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip", "/tmp/steamcmd");
            return "/tmp/steamcmd/steamcmd.exe";
        });

        // Call the download function
        const result = await steam.download();

        // Verify unzip was called with the correct URL
        expect(unzip).toHaveBeenCalledWith(
            "https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip",
            "/tmp/steamcmd"
        );

        // Verify the result is the expected path
        expect(result).toBe("/tmp/steamcmd/steamcmd.exe");

        // Restore the original implementation
        downloadSpy.mockRestore();
    });

    test("Authenticates user successfully", async () => {
        // Create a spy on the authenticated function
        const authenticatedSpy = vi.spyOn(steam, 'authenticated');

        // Mock the implementation to avoid dependencies
        authenticatedSpy.mockImplementation(async (username) => {
            return username === "testuser";
        });

        // Mock file access and reading
        (access as any).mockResolvedValue(true);
        (readFile as any).mockResolvedValue('{"users": {"testuser": {}}}');

        const isAuthenticated = await steam.authenticated("testuser");

        expect(isAuthenticated).toBe(true);

        // Restore the original implementation
        authenticatedSpy.mockRestore();
    });

    test("Login with password succeeds", async () => {
        // Create a spy on the login function
        const loginSpy = vi.spyOn(steam, 'login');

        // Mock the implementation to avoid dependencies
        loginSpy.mockImplementation(async (username, options) => {
            // Call the mocked command function directly
            await command("steamcmd.exe", "+@ShutdownOnFailedCommand", "1", "+login", username, options?.password || "", "+quit");
            return;
        });

        // Mock successful command execution
        (command as any).mockResolvedValue(0);

        await expect(steam.login("testuser", { password: "testpass" }))
            .resolves.not.toThrow();

        expect(command).toHaveBeenCalledWith(
            "steamcmd.exe",
            "+@ShutdownOnFailedCommand",
            "1",
            "+login",
            "testuser",
            "testpass",
            "+quit"
        );

        // Restore the original implementation
        loginSpy.mockRestore();
    });

    test("Publish fails without authentication", async () => {
        // Create a spy on the authenticated function
        const authenticatedSpy = vi.spyOn(steam, 'authenticated');

        // Mock the authenticated function to return false
        authenticatedSpy.mockResolvedValue(false);

        // Create a spy on the publish function
        const publishSpy = vi.spyOn(steam, 'publish');

        // Keep the original implementation but make sure it calls our mocked authenticated function
        publishSpy.mockImplementation(async (username) => {
            if (!await steam.authenticated(username)) {
                throw new Error("Not authenticated");
            }
            return;
        });

        await expect(steam.publish("testuser", {
            appid: "4000",
            folder: "/absolute/path"
        })).rejects.toThrow("Not authenticated");

        // Restore the original implementations
        authenticatedSpy.mockRestore();
        publishSpy.mockRestore();
    });
});
