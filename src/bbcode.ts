import { parse, render } from "@steamdown/core";

/**
 * Convert a markdown string to BBCode
 * @param markdown The markdown to convert
 * @returns The converted BBCode
 */
export function convert(markdown: string): string {
    const [tree, context] = parse(markdown);

    const bbcode = render(tree, context);

    return bbcode
        .replace(/!\[url=(https:\/\/.*)\].*\[\/url\]/g, "[img]$1[/img]")
        .replace(/\[url=(https:\/\/.*)\]!\[.*\[\/url\]\]\((https:\/\/.*)\)/g, "[url=$2][img]$1[/img][/url]")
        .replace(/`(.*?)`/g, "[code]$1[/code]");
}
