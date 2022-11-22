import bindings from "bindings"
import EventEmitter from "events"
import { ConstructorConfig, FetchConfig, PlayerNativeObject } from "./types"
import {
  LibrespotModule,
  PlayerEvent,
  PlayerEventTypes,
  TokenScope,
} from "./types"
import path from "path"
import { request, GenericPlayer, safe_execution } from "./utils"
import { TokenHandler } from "./tokenHandler"
import { PositionHolder } from "./positionHolder"

const librespotModule: LibrespotModule = bindings("librespot.node")

const DEFAULT_SCOPES: TokenScope[] = [
  "playlist-read-collaborative",
  "user-follow-read",
  "user-library-read",
  "user-top-read",
  "user-read-recently-played",
  "user-modify-playback-state",
]

export class SpotifyPlayerSpirc extends GenericPlayer {
  private playerInstance: PlayerNativeObject | undefined

  private device_id!: string
  private eventEmitter = new EventEmitter()
  private _isInitialized = false
  private tokenHandler: TokenHandler
  private _positionHolder: PositionHolder

  private saveToken: boolean

  private _volume = 0

  constructor(config: ConstructorConfig) {
    super()
    librespotModule
      .create_player_spirc(
        {
          ...config.auth,
          auth_type: config.auth.authType ?? "",
          backend: "",
          normalization: false,
          normalization_pregain: 0,
        },
        this.player_event_callback.bind(this)
      )
      .then((val) => {
        this.playerInstance = val
        this.device_id = librespotModule.get_device_id_spirc.call(val)
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
    this._positionHolder.callback = (position_ms) => {
      this.eventEmitter.emit("TimeUpdated", {
        event: "TimeUpdated",
        position_ms,
      })
    }
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

    this.addListener("Stopped", (e) => {
      this._positionHolder.clearListener()
      this._positionHolder.position = 0
    })

    this.addListener("PositionCorrection", (e) => {
      this._positionHolder.position = e.position_ms
    })

    this.addListener("Seeked", (e) => {
      this._positionHolder.position = e.position_ms
    })

    this.addListener("TrackChanged", () => {
      this._positionHolder.clearListener()
      this._positionHolder.position = 0
    })
  }

  public get isInitialized() {
    return this._isInitialized
  }

  private player_event_callback(event: PlayerEvent) {
    console.log(event)
    this.eventEmitter.emit(event.event, event)
  }

  @safe_execution
  public async play() {
    await librespotModule.play_spirc.call(this.playerInstance)
  }

  @safe_execution
  public async pause() {
    await librespotModule.pause_spirc.call(this.playerInstance)
  }

  @safe_execution
  public async seek(posMs: number) {
    await librespotModule.seek_spirc.call(this.playerInstance, posMs)
  }

  @safe_execution
  public async close() {
    this._positionHolder.clearListener()
    this.eventEmitter.removeAllListeners()
    await librespotModule.close_player_spirc.call(this.playerInstance)
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

    librespotModule.set_volume_spirc.call(this.playerInstance, parsedVolume)
  }

  public getVolume(raw = false) {
    if (raw) {
      return this._volume
    }

    return (this._volume / 65535) * 100
  }

  @safe_execution
  public async load(trackURIs: string | string[], token?: string) {
    if (!token) {
      token = (await this.getToken())?.access_token
      if (!token) {
        throw Error("Failed to get a valid access token")
      }
    }

    console.log("using existing token", token)

    const options: FetchConfig = {
      method: "PUT",
      search: {
        device_id: this.device_id,
      },
      auth: token,
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

  public on = this.addListener
  public off = this.removeListener

  public addListener<T extends PlayerEventTypes>(
    event: T,
    callback: (event: PlayerEvent<T>) => void
  ) {
    return this.eventEmitter.addListener(event, callback)
  }

  public removeListener<T extends PlayerEventTypes>(
    event: T,
    callback: (event: PlayerEvent<T>) => void
  ) {
    return this.eventEmitter.removeListener(event, callback)
  }

  public once<T extends PlayerEventTypes>(
    event: T,
    callback: (event: PlayerEvent<T>) => void
  ) {
    return this.eventEmitter.once(event, callback)
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

    const res = await librespotModule.get_token_spirc.call(
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
