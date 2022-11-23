import assert from "assert"
import { PathLike } from "fs"
import { writeFile, readFile } from "fs/promises"
import { Token, TokenScope } from "./types"

export class TokenHandler {
  private tokenMap: Token[] = []
  private filePath: PathLike

  constructor(filePath: string) {
    this.filePath = filePath
  }

  private async dumpFile() {
    await writeFile(this.filePath, JSON.stringify(this.tokenMap))
  }

  private async readFile() {
    try {
      this.tokenMap = JSON.parse(
        await readFile(this.filePath, { encoding: "utf-8" })
      )
      assert(Array.isArray(this.tokenMap))
    } catch (e) {
      console.warn("Failed to parse token store, creating new")
      this.tokenMap = []
    }
  }

  public async addToken(token: Token) {
    await this.readFile()
    this.tokenMap.push(token)
    await this.dumpFile()
  }

  public async getToken(scopes: TokenScope[]) {
    await this.readFile()
    for (const token of this.tokenMap) {
      // Check if required scopes are already cached
      if (scopes.some((val) => token.scopes.includes(val))) {
        if (token.expiry_from_epoch > Date.now()) {
          // Check if the matching token is not expired
          return token
        }
      }
    }
  }
}
