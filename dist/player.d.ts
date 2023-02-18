import { TokenScope } from "./types";
import { GenericPlayer } from "./genericPlayer";
export declare class SpotifyPlayer extends GenericPlayer {
    protected onPlayerInitialized(): void;
    /**
     * Set player state to play
     */
    play(): Promise<void>;
    /**
     * Set player state to paused
     */
    pause(): Promise<void>;
    /**
     * Seek current song to position
     * @param posMs position in milliseconds
     */
    seek(posMs: number): Promise<void>;
    /**
     * Clear all listeners and close player
     */
    close(): Promise<void>;
    /**
     * Get current position of player
     * @returns current position in milliseconds
     */
    getCurrentPosition(): number;
    /**
     * Set volume in percentage or uint16
     * @param volume: Volume in percentage or uint16
     * @param raw if true, volume is set in uint16. Otherwise percentage. (Default: false)
     */
    setVolume(volume: number, raw?: boolean): Promise<void>;
    /**
     * Returns volume in percentage or uint16
     * @param raw If true, returns volume in uint16. Otherwise percentage
     * @returns volume in percentage or uint16
     */
    getVolume(raw?: boolean): number;
    /**
     * Loads a track by Spotify URI or URL
     * @param trackURI spotify URI or URL of track to be loaded. (Eg. spotify:track:4PTG3Z6ehGkBFwjybzWkR8)
     * @param autoplay if true, track will start playing immediately after being loaded. (Default: false)
     */
    load(trackURIs: string | string[], autoPlay?: boolean, startPosition?: number): Promise<void>;
    /**
     * Get spotify access token for logged in account
     * @param scopes scopes to get token for. (https://developer.spotify.com/documentation/general/guides/authorization/scopes/)
     * @returns token
     */
    getToken(...scopes: TokenScope[]): Promise<any>;
    /**
     * Returns spotify canvas URL for track
     * @param track track URI or URL to get canvas for
     * @returns Spotify canvas public URL
     */
    getCanvas(track: string): Promise<import("./types").CanvazResponse | undefined>;
    /**
     * Get lyrics for spotify track
     * @param track Spotify track URI or URL
     * @returns
     */
    getLyrics(track: string): Promise<any>;
}
