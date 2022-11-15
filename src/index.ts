import bindings from "bindings"
import EventEmitter from "events"
import { Token, ConstructorConfig, FetchConfig } from "../types/index"
import {
  LibrespotModule,
  PlayerEvent,
  PlayerEventTypes,
  TokenScope,
} from "../types"
import path from "path"
import { readFile, writeFile } from "fs/promises"
import { request } from "./utils"
import assert from "assert"
import { PathLike } from "fs"

const librespotModule: LibrespotModule = bindings("librespot.node")

type PlayerNativeObject = never

const DEFAULT_SCOPES: TokenScope[] = [
  "playlist-read-collaborative",
  "user-follow-read",
  "user-library-read",
  "user-top-read",
  "user-read-recently-played",
  "user-modify-playback-state",
]

class TokenHandler {
  private tokenMap: Token[] = []
  private filePath: PathLike

  constructor(filePath: PathLike) {
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
      console.error("Failed to parse token store", e)
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
      if (scopes.some((val) => token.scopes.includes(val)))
        if (token.expiry_from_epoch > Date.now()) {
          // Check if the matching token is not expired
          return token
        }
    }
  }
}
export class SpotifyPlayer {
  private playerInstance: PlayerNativeObject | undefined

  // TODO: Error out if player isn't initialized
  private device_id!: string
  private eventEmitter = new EventEmitter()
  private _isInitialized = false
  private tokenHandler: TokenHandler

  private saveToken: boolean

  constructor(config: ConstructorConfig) {
    librespotModule
      .create_player(
        config.auth.username,
        config.auth.password,
        config.auth.authType ?? "",
        this.player_event_callback.bind(this)
      )
      .then((val) => {
        this.playerInstance = val
        this.device_id = librespotModule.get_device_id.call(val)

        this._isInitialized = true
        this.eventEmitter.emit("PlayerInitialized")
      })

    this.tokenHandler = new TokenHandler(
      config.cache_path ?? path.join(__dirname, "token_dump")
    )
    this.saveToken = config.save_tokens ?? false
  }

  public get isInitialized() {
    return this._isInitialized
  }

  private player_event_callback(event: PlayerEvent<string>) {
    this.eventEmitter.emit(event.event, event)
  }

  public async play() {
    await librespotModule.play.call(this.playerInstance)
  }

  public async pause() {
    await librespotModule.pause.call(this.playerInstance)
  }

  public async seek(posMs: number) {
    await librespotModule.seek.call(this.playerInstance, posMs)
  }

  public async volume(volume: number, raw = false) {
    let parsedVolume: number = volume
    if (!raw) {
      parsedVolume = (Math.min(Math.max(volume, 100), 0) / 100) * 65535
    }

    librespotModule.set_volume.call(this.playerInstance, parsedVolume)
  }

  public async load(trackURIs: string | string[]) {
    const token = await this.getToken()

    if (!token) {
      throw Error("Failed to get a valid access token")
    }

    const options: FetchConfig = {
      method: "PUT",
      search: {
        device_id: this.device_id,
      },
      auth: token.access_token,
      body: {},
    }

    const regex = new RegExp(
      /^(?<urlType>(?:spotify:|(?:https?:\/\/(?:open|play)\.spotify\.com\/)))(?:embed)?\/?(?<type>album|track|playlist|artist)(?::|\/)((?:[0-9a-zA-Z]){22})/
    )

    if (typeof trackURIs === "string") {
      trackURIs = [trackURIs]
    }

    for (let trackURI of trackURIs) {
      const match = trackURI.match(regex)

      if (match?.groups?.type) {
        if (match.groups.urlType?.startsWith("https")) {
          const parsedUrl = new URL(trackURI)
          trackURI = `spotify:${match.groups.type}:${parsedUrl.pathname
            .split("/")
            .at(-1)}`
        }

        switch (match.groups.type) {
          case "track":
            options.body!["uris"] = (
              (options.body!["uris"] as string[]) ?? []
            ).push(trackURI)
            break
          default:
            options.body!["context_uri"] = trackURI
            break
        }

        console.log(options)

        await request<void>(
          "https://api.spotify.com/v1/me/player/play",
          options
        )
        // console.log(resp)
      }
    }
  }

  public on<T extends PlayerEventTypes>(
    event: T,
    callback: (event: PlayerEvent<T>) => void
  ) {
    this.eventEmitter.on(event, callback)
  }

  public addListener<T extends PlayerEventTypes>(
    event: T,
    callback: (event: PlayerEvent<T>) => void
  ) {
    this.eventEmitter.addListener(event, callback)
  }

  public removeListener<T extends PlayerEventTypes>(
    event: T,
    callback: (event: PlayerEvent<T>) => void
  ) {
    this.eventEmitter.removeListener(event, callback)
  }

  public removeAllListeners() {
    this.eventEmitter.removeAllListeners()
  }

  public getDeviceId() {
    return this.device_id
  }

  public async getToken(...scopes: TokenScope[]) {
    scopes = scopes && scopes.length > 0 ? scopes : DEFAULT_SCOPES

    const cachedToken = await this.tokenHandler.getToken(scopes)
    if (cachedToken) {
      return cachedToken
    }

    const res = await librespotModule.get_token.call(
      this.playerInstance,
      scopes.join(",")
    )

    if (res) {
      res.scopes = (res.scopes as unknown as string).split(",") as TokenScope[]
      res.expiry_from_epoch = Date.now() + res.expires_in

      if (this.saveToken) {
        await this.tokenHandler.addToken(res)
      }
    }

    return res
  }
}
