import EventEmitter from "events"
import path from "path"
import { TokenHandler } from "./tokenHandler"
import { PositionHolder } from "./positionHolder"
import { Token } from "./types"
import {
  PlayerNativeObject,
  ConstructorConfig,
  PlayerEvent,
  PlayerEventTypes,
  TokenScope,
} from "./types"
import { _librespotModule } from "./utils"

export function safe_execution(
  _: unknown,
  propertyKey: string,
  descriptor: TypedPropertyDescriptor<any>
) {
  const originalMethod = descriptor.value

  descriptor.value = function (...args: unknown[]) {
    if ((this as GenericPlayer).isInitialized) {
      return originalMethod.call(this, ...args)
    } else {
      throw new Error(
        `Cannot call method ${propertyKey} before player has initialized`
      )
    }
  }

  return descriptor
}

export abstract class GenericPlayer {
  protected tokenHandler: TokenHandler
  protected _positionHolder: PositionHolder
  public eventEmitter = new EventEmitter()

  protected playerInstance: PlayerNativeObject | undefined

  protected saveToken: boolean
  protected _volume = 0

  protected device_id!: string

  protected _isInitialized = false

  public get isInitialized() {
    return this._isInitialized
  }

  protected abstract onPlayerInitialized(): void

  constructor(
    config: ConstructorConfig,
    playerConstructMethod:
      | "create_player"
      | "create_player_spirc" = "create_player"
  ) {
    this.tokenHandler = new TokenHandler(
      config.cache_path ?? path.join(__dirname, "token_dump")
    )
    this._positionHolder = new PositionHolder(config.pos_update_interval)

    _librespotModule[playerConstructMethod](
      {
        username: config.auth.username,
        password: config.auth.password,
        auth_type: config.auth.authType ?? "",
        backend: "",
        normalization: false,
        normalization_pregain: 0,
      },
      this.player_event_callback.bind(this)
    )
      .then((val) => {
        this.playerInstance = val

        this.onPlayerInitialized()
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

    this._positionHolder.callback = (position_ms) => {
      this.eventEmitter.emit("TimeUpdated", {
        event: "TimeUpdated",
        position_ms,
      })
    }
    this.saveToken = config.save_tokens ?? false
  }

  private player_event_callback(event: PlayerEvent) {
    this.eventEmitter.emit(event.event, event)
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

  public abstract setVolume(volume: number, raw?: boolean): Promise<void>
  public abstract load(
    trackURIs: string | string[],
    autoPlay?: boolean,
    startPosition?: number
  ): Promise<void>
  public abstract getToken(...scopes: TokenScope[]): Promise<Token | undefined>
  public abstract getVolume(raw?: boolean): number
  public abstract seek(posMs: number): Promise<void>
  public abstract close(): Promise<void>
  public abstract getCurrentPosition(): number
}
