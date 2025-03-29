export interface PublishOptions {
    id?: string;
    appid: string;
    /**
     * The absolute path to the icon to upload.
     */
    icon?: string;
    title?: string;
    /**
     * The description to upload. This will be converted from Markdown to BBCode.
     */
    description?: string;
    visibility?: number;
    /**
     * The changelog to upload. This will be converted from Markdown to BBCode.
     */
    changelog?: string;
    /**
     * The absolute path to the folder or archive to upload.
     */
    folder: string;
}
export declare function publish(username: string, options: PublishOptions): Promise<void>;
export declare function authenticated(username: string): Promise<boolean>;
/**
 * Login to Steam.
 * This caches the login credentials for future use.
 * @param username Steam username
 * @param credentials Steam credentials. Optional if login credentials are already cached.
 */
export declare function login(username: string, credentials?: {
    password?: string;
    totp?: string;
    vdf?: string;
}): Promise<void>;
/**
 * Update SteamCMD. This does not require login.
 */
export declare function update(): Promise<void>;
export declare function download(): Promise<string>;
