import { Token, TokenScope } from "./types";
export declare class TokenHandler {
    private tokenMap;
    private filePath;
    constructor(filePath: string);
    private dumpFile;
    private readFile;
    addToken(token: Token): Promise<void>;
    getToken(scopes: TokenScope[]): Promise<Token | undefined>;
}
