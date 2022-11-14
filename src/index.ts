import bindings from "bindings"
import EventEmitter from "events"
import {
  LibrespotModule,
  AuthDetails,
  PlayerEvent,
  PlayerEventTypes,
  TokenScope,
} from "../types"

const librespotModule: LibrespotModule = bindings("librespot.node")

type PlayerNativeObject = never

export class SpotifyPlayer {
  private playerInstance: PlayerNativeObject | undefined
  private device_id: string | undefined
  private eventEmitter = new EventEmitter()
  private _isInitialized = false

  constructor(auth: AuthDetails) {
    librespotModule
      .create_player(
        auth.username,
        auth.password,
        auth.authType ?? "",
        this.player_event_callback.bind(this)
      )
      .then((val) => {
        this.playerInstance = val
        this.device_id = librespotModule.get_device_id.call(val)

        this._isInitialized = true
        this.eventEmitter.emit("PlayerInitialized")
      })
  }

  public get isInitialized() {
    return this._isInitialized
  }

  private player_event_callback(event: PlayerEvent<string>) {
    this.eventEmitter.emit(event.event, event)
    console.log(event)
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

  public async getToken(scopes?: TokenScope[]) {
    scopes = scopes || [
      "playlist-read-collaborative",
      "user-follow-read",
      "user-library-read",
      "user-top-read",
      "user-read-recently-played",
    ]
    const res = await librespotModule.get_token.call(
      this.playerInstance,
      scopes.join(",")
    )

    res.scopes = (res.scopes as unknown as string).split(",") as TokenScope[]

    return res
  }
}

setInterval(() => {})
