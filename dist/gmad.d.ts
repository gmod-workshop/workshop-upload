/**
 * Create a GMA file for an addon.
 * @param dir The directory to create the addon from.
 * @param out The directory to output the addon to.
 * @returns The absolute path to the addon.
 */
export declare function create(dir: string, out: string): Promise<string>;
/**
 * Download gmad
 * @returns The absolute path to the gmad executable.
 */
export declare function download(): Promise<string>;
