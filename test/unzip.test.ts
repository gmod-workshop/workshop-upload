import { describe, test, expect, vi, beforeEach } from "vitest";
import { unzip } from "../src/unzip.js";
import decompress from "decompress";
import { buffer } from "stream/consumers";

// Mock dependencies
vi.mock("decompress", () => ({
    default: vi.fn()
}));

vi.mock("stream/consumers", () => ({
    buffer: vi.fn()
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Unzip", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test("Successfully unzips a file", async () => {
        // Mock fetch response
        const mockBody = new ReadableStream();
        mockFetch.mockResolvedValue({
            body: mockBody
        });

        // Mock buffer response
        const mockBufferData = Buffer.from("fake-zip-data");
        (buffer as any).mockResolvedValue(mockBufferData);

        // Mock decompress response
        const mockFiles = [
            { path: "file1.txt", data: Buffer.from("content1") },
            { path: "file2.txt", data: Buffer.from("content2") }
        ];
        (decompress as any).mockResolvedValue(mockFiles);

        // Call the unzip function
        const result = await unzip("https://example.com/file.zip", "/output/path");

        // Verify the function was called with the correct parameters
        expect(mockFetch).toHaveBeenCalledWith("https://example.com/file.zip");
        expect(buffer).toHaveBeenCalledWith(mockBody);
        expect(decompress).toHaveBeenCalledWith(mockBufferData, "/output/path");
        
        // Verify the result
        expect(result).toEqual(mockFiles);
    });

    test("Throws error when fetch response has no body", async () => {
        // Mock fetch response with no body
        mockFetch.mockResolvedValue({
            body: null
        });

        // Call the unzip function and expect it to throw
        await expect(unzip("https://example.com/file.zip", "/output/path"))
            .rejects.toThrow("Failed to download file");

        // Verify fetch was called but not buffer or decompress
        expect(mockFetch).toHaveBeenCalledWith("https://example.com/file.zip");
        expect(buffer).not.toHaveBeenCalled();
        expect(decompress).not.toHaveBeenCalled();
    });

    test("Handles decompress errors", async () => {
        // Mock fetch response
        const mockBody = new ReadableStream();
        mockFetch.mockResolvedValue({
            body: mockBody
        });

        // Mock buffer response
        const mockBufferData = Buffer.from("fake-zip-data");
        (buffer as any).mockResolvedValue(mockBufferData);

        // Mock decompress to throw an error
        const decompressError = new Error("Decompress failed");
        (decompress as any).mockRejectedValue(decompressError);

        // Call the unzip function and expect it to throw
        await expect(unzip("https://example.com/file.zip", "/output/path"))
            .rejects.toThrow(decompressError);

        // Verify the function was called with the correct parameters
        expect(mockFetch).toHaveBeenCalledWith("https://example.com/file.zip");
        expect(buffer).toHaveBeenCalledWith(mockBody);
        expect(decompress).toHaveBeenCalledWith(mockBufferData, "/output/path");
    });

    test("Handles fetch errors", async () => {
        // Mock fetch to throw an error
        const fetchError = new Error("Network error");
        mockFetch.mockRejectedValue(fetchError);

        // Call the unzip function and expect it to throw
        await expect(unzip("https://example.com/file.zip", "/output/path"))
            .rejects.toThrow(fetchError);

        // Verify fetch was called but not buffer or decompress
        expect(mockFetch).toHaveBeenCalledWith("https://example.com/file.zip");
        expect(buffer).not.toHaveBeenCalled();
        expect(decompress).not.toHaveBeenCalled();
    });
});
