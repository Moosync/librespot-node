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

const POSITION_UPDATE_INTERVAL = 500

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

class PositionHolder {
  public position = 0
  private positionListener: ReturnType<typeof setInterval> | undefined
  private updateInterval: number

  constructor(updateInterval?: number) {
    this.updateInterval = updateInterval || POSITION_UPDATE_INTERVAL
  }

  public setListener() {
    this.clearListener()

    this.positionListener = setInterval(() => {
      this.position += this.updateInterval
    }, this.updateInterval)
  }

  public clearListener() {
    if (this.positionListener) {
      clearInterval(this.positionListener)
    }
  }
}

function safe_execution(
  _: unknown,
  propertyKey: string,
  descriptor: TypedPropertyDescriptor<any>
) {
  const originalMethod = descriptor.value

  descriptor.value = function (...args: unknown[]) {
    if ((this as SpotifyPlayer).isInitialized) {
      originalMethod.call(this, ...args)
    } else {
      throw new Error(
        `Cannot call method ${propertyKey} before player has initialized`
      )
    }
  }

  return descriptor
}

export class SpotifyPlayer {
  private playerInstance: PlayerNativeObject | undefined

  private device_id!: string
  private eventEmitter = new EventEmitter()
  private _isInitialized = false
  private tokenHandler: TokenHandler
  private _positionHolder: PositionHolder

  private saveToken: boolean

  private _volume = 0

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
        this.device_id = this.getDeviceId()
        this.registerListeners(config.initial_volume)
        this._isInitialized = true
        this.eventEmitter.emit("PlayerInitialized", {
          event: "PlayerInitialized",
        })
      })
      .catch((e) => {
        this.eventEmitter.emit("InitializationError", {
          event: "InitializationError",
          error: e,
        })
      })

    this.tokenHandler = new TokenHandler(
      config.cache_path ?? path.join(__dirname, "token_dump")
    )
    this._positionHolder = new PositionHolder(config.pos_update_interval)
    this.saveToken = config.save_tokens ?? false
  }

  private registerListeners(
    initial_volume: ConstructorConfig["initial_volume"] | undefined
  ) {
    this.addListener("VolumeChanged", (event) => {
      this._volume = event.volume
    })

    if (initial_volume) {
      this.addListener("SessionConnected", () => {
        this.setVolume(initial_volume.volume, initial_volume.raw)
      })
    }

    this.addListener("Playing", (e) => {
      this._positionHolder.setListener()
      this._positionHolder.position = e.position_ms
    })

    this.addListener("Paused", (e) => {
      this._positionHolder.clearListener()
      this._positionHolder.position = e.position_ms
    })

    this.addListener("PositionCorrection", (e) => {
      this._positionHolder.position = e.position_ms
    })

    this.addListener("TrackChanged", () => {
      this._positionHolder.position = 0
    })
  }

  public get isInitialized() {
    return this._isInitialized
  }

  private player_event_callback(event: PlayerEvent<string>) {
    this.eventEmitter.emit(event.event, event)
  }

  @safe_execution
  public async play() {
    await librespotModule.play.call(this.playerInstance)
  }

  @safe_execution
  public async pause() {
    await librespotModule.pause.call(this.playerInstance)
  }

  @safe_execution
  public async seek(posMs: number) {
    await librespotModule.seek.call(this.playerInstance, posMs)
  }

  public getCurrentPosition() {
    return this._positionHolder.position
  }

  @safe_execution
  public async setVolume(volume: number, raw = false) {
    let parsedVolume: number = volume
    if (!raw) {
      parsedVolume = (Math.max(Math.min(volume, 100), 0) / 100) * 65535
    }

    librespotModule.set_volume.call(this.playerInstance, parsedVolume)
  }

  public getVolume(raw = false) {
    if (raw) {
      return this._volume
    }

    return (this._volume / 65535) * 100
  }

  @safe_execution
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
            options.body!["uris"] = (options.body!["uris"] as string[]) ?? []
            ;(options.body!["uris"]! as string[]).push(trackURI)
            break
          default:
            options.body!["context_uri"] = trackURI
            break
        }
      }
    }

    await request<void>("https://api.spotify.com/v1/me/player/play", options)
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
    this.registerListeners(undefined)
  }

  public getDeviceId() {
    return this.device_id
  }

  @safe_execution
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
