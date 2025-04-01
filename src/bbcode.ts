import { Converter } from "@gmod-workshop/steamdown";

/**
 * Convert a markdown string to BBCode
 * @param markdown The markdown to convert
 * @returns The converted BBCode
 */
export async function convert(markdown: string): Promise<string> {
    const converter = new Converter();

    const bbcode = await converter.convert(markdown);

    return bbcode
        .replace(/https:\/\/github\.com\/([^\/]+\/[^\/]+)\/(issues|pull)\/(\d+)/g, '[url=https://github.com/$1/$2/$3]#$3[/url]')
        .trim();
}
