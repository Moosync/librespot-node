import { TokenScope } from "./types"
import { DEFAULT_SCOPES, _librespotModule } from "./utils"
import { GenericPlayer, safe_execution } from "./genericPlayer"

export class SpotifyPlayer extends GenericPlayer {
  protected onPlayerInitialized() {
    this.device_id = _librespotModule.get_device_id.call(this.playerInstance)
  }

  /**
   * Set player state to play
   */
  @safe_execution
  public async play() {
    await _librespotModule.play.call(this.playerInstance)
  }

  /**
   * Set player state to paused
   */
  @safe_execution
  public async pause() {
    await _librespotModule.pause.call(this.playerInstance)
  }

  /**
   * Seek current song to position
   * @param posMs position in milliseconds
   */
  @safe_execution
  public async seek(posMs: number) {
    await _librespotModule.seek.call(this.playerInstance, posMs)
  }

  /**
   * Clear all listeners and close player
   */
  @safe_execution
  public async close() {
    this._positionHolder.clearListener()
    this.eventEmitter.removeAllListeners()
    await _librespotModule.close_player.call(this.playerInstance)
  }

  /**
   * Get current position of player
   * @returns current position in milliseconds
   */
  public getCurrentPosition() {
    return this._positionHolder.position
  }

  /**
   * Set volume in percentage or uint16
   * @param volume: Volume in percentage or uint16
   * @param raw if true, volume is set in uint16. Otherwise percentage. (Default: false)
   */
  @safe_execution
  public async setVolume(volume: number, raw = false) {
    let parsedVolume: number = volume
    if (!raw) {
      parsedVolume = (Math.max(Math.min(volume, 100), 0) / 100) * 65535
    }

    await _librespotModule.set_volume.call(this.playerInstance, parsedVolume)
  }

  /**
   * Returns volume in percentage or uint16
   * @param raw If true, returns volume in uint16. Otherwise percentage
   * @returns volume in percentage or uint16
   */
  public getVolume(raw = false) {
    if (raw) {
      return this._volume
    }

    return (this._volume / 65535) * 100
  }

  /**
   * Loads a track by Spotify URI or URL
   * @param trackURI spotify URI or URL of track to be loaded. (Eg. spotify:track:4PTG3Z6ehGkBFwjybzWkR8)
   * @param autoplay if true, track will start playing immediately after being loaded. (Default: false)
   */
  @safe_execution
  public async load(
    trackURIs: string | string[],
    autoPlay = false,
    startPosition = 0
  ) {
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
      }
    }

    for (const t of trackURIs) {
      await _librespotModule.load_track.call(
        this.playerInstance,
        t,
        autoPlay,
        startPosition
      )
    }
  }

  /**
   * Get spotify access token for logged in account
   * @param scopes scopes to get token for. (https://developer.spotify.com/documentation/general/guides/authorization/scopes/)
   * @returns token
   */
  @safe_execution
  public async getToken(...scopes: TokenScope[]) {
    scopes = scopes && scopes.length > 0 ? scopes : DEFAULT_SCOPES

    const cachedToken = await this.tokenHandler.getToken(scopes)
    if (cachedToken) {
      return cachedToken
    }

    const res = await _librespotModule.get_token.call(
      this.playerInstance,
      scopes.join(",")
    )

    if (res) {
      res.scopes = (res.scopes as unknown as string).split(",") as TokenScope[]
      res.expiry_from_epoch = Date.now() + res.expires_in

      await this.tokenHandler.addToken(res)
    }

    return res
  }

  /**
   * Returns spotify canvas URL for track
   * @param track track URI or URL to get canvas for
   * @returns Spotify canvas public URL
   */
  @safe_execution
  public async getCanvas(track: string) {
    const [uri, type] = this.validateUri(track)

    if (uri && type === "track") {
      const metadata = await _librespotModule.get_canvas.call(
        this.playerInstance,
        uri
      )

      return metadata
    }
  }

  /**
   * Get lyrics for spotify track
   * @param track Spotify track URI or URL
   * @returns
   */
  @safe_execution
  public async getLyrics(track: string) {
    const [uri, type] = this.validateUri(track)

    if (uri && type === "track") {
      const metadata = await _librespotModule.get_lyrics.call(
        this.playerInstance,
        uri
      )

      try {
        return JSON.parse(metadata)
      } catch {
        return metadata
      }
    }
  }
}
