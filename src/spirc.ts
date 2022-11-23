import { FetchConfig, ConstructorConfig } from "./types"
import { TokenScope } from "./types"
import { request, DEFAULT_SCOPES, _librespotModule } from "./utils"
import { GenericPlayer, safe_execution } from "./genericPlayer"
export class SpotifyPlayerSpirc extends GenericPlayer {
  protected onPlayerInitialized() {
    this.device_id = _librespotModule.get_device_id_spirc.call(
      this.playerInstance
    )
  }

  constructor(config: ConstructorConfig) {
    super(config, "create_player_spirc")
  }

  @safe_execution
  public async play() {
    await _librespotModule.play_spirc.call(this.playerInstance)
  }

  @safe_execution
  public async pause() {
    await _librespotModule.pause_spirc.call(this.playerInstance)
  }

  @safe_execution
  public async seek(posMs: number) {
    await _librespotModule.seek_spirc.call(this.playerInstance, posMs)
  }

  @safe_execution
  public async close() {
    this._positionHolder.clearListener()
    this.eventEmitter.removeAllListeners()
    await _librespotModule.close_player_spirc.call(this.playerInstance)
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

    _librespotModule.set_volume_spirc.call(this.playerInstance, parsedVolume)
  }

  public getVolume(raw = false) {
    if (raw) {
      return this._volume
    }

    return (this._volume / 65535) * 100
  }

  @safe_execution
  public async load(trackURIs: string | string[]) {
    const token = (await this.getToken())?.access_token
    if (!token) {
      throw Error("Failed to get a valid access token")
    }

    console.debug("using existing token", token)

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

  @safe_execution
  public async getToken(...scopes: TokenScope[]) {
    scopes = scopes && scopes.length > 0 ? scopes : DEFAULT_SCOPES

    if (this.saveToken) {
      const cachedToken = await this.tokenHandler.getToken(scopes)
      if (cachedToken) {
        return cachedToken
      }
    }

    const res = await _librespotModule.get_token_spirc.call(
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
