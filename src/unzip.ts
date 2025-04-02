import decompress from "decompress";
import { buffer } from "stream/consumers";

export async function unzip(url: string, output: string): Promise<decompress.File[]> {
    const { body } = await fetch(url);

    if (!body) {
        throw new Error("Failed to download file");
    }

    const buf = await buffer(body);

    return await decompress(buf, output);
}
