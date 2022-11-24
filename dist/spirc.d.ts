import { ConstructorConfig } from "./types";
import { TokenScope } from "./types";
import { GenericPlayer } from "./genericPlayer";
export declare class SpotifyPlayerSpirc extends GenericPlayer {
    protected onPlayerInitialized(): void;
    constructor(config: ConstructorConfig);
    play(): Promise<void>;
    pause(): Promise<void>;
    seek(posMs: number): Promise<void>;
    close(): Promise<void>;
    getCurrentPosition(): number;
    setVolume(volume: number, raw?: boolean): Promise<void>;
    getVolume(raw?: boolean): number;
    load(trackURIs: string | string[]): Promise<void>;
    getToken(...scopes: TokenScope[]): Promise<any>;
}
