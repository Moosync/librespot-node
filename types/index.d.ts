interface FetchConfig {
  method: "GET" | "POST" | "PUT"
  body?: Record<string, unknown> | string | Uint8Array
  headers?: Record<string, string | string[] | number>
  search?: Record<string, string>
  auth?: string
}

interface LibrespotModule {
  // Non spirc player
  create_player: (
    config: FullConstructorConfig,
    callback: (event: PlayerEvent) => void
  ) => Promise<PlayerNativeObject>

  play: () => Promise<void>
  pause: () => Promise<void>
  seek: (timeMs: number) => Promise<void>
  set_volume: (volume: number) => Promise<void>
  close_player: () => Promise<void>
  get_device_id: () => string
  get_token: (scopes: string) => Promise<Token | undefined>
  load_track: (
    trackUri: string,
    autoPlay: boolean,
    start_pos: number
  ) => Promise<void>

  // Spirc player
  create_player_spirc: (
    config: FullConstructorConfig,
    callback: (event: PlayerEvent) => void
  ) => Promise<PlayerNativeObject>

  play_spirc: () => Promise<void>
  pause_spirc: () => Promise<void>
  seek_spirc: (timeMs: number) => Promise<void>
  set_volume_spirc: (volume: number) => Promise<void>
  close_player_spirc: () => Promise<void>
  get_device_id_spirc: () => string
  get_token_spirc: (scopes: string) => Promise<Token | undefined>
  get_metadata_spirc: (
    trackUri: string
  ) => Promise<import("../src/types").CanvazResponse>
}

interface FullConstructorConfig {
  auth: AuthDetails
  save_tokens: boolean
  cache_path: string
  pos_update_interval: number
  backend: string
  gapless: boolean
  bitrate: "96" | "160" | "320"
  passThrough: boolean
  normalizationConfig: NormalizationConfig
  connectConfig: ConnectConfig
}

type PlayerNativeObject = never
