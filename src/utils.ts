import bindings from "bindings"
import EventEmitter from "events"
import https, { RequestOptions } from "https"
import path from "path"
import { PositionHolder } from "./positionHolder"
import { TokenHandler } from "./tokenHandler"
import {
  ConstructorConfig,
  FetchConfig,
  LibrespotModule,
  PlayerEvent,
  PlayerEventTypes,
  PlayerNativeObject,
  TokenScope,
} from "./types"

export function request<T>(url: string, config: FetchConfig): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const parsedUrl = new URL(url)

    if (!config.headers) {
      config.headers = {}
    }

    config.headers["Content-Type"] = "application/json"
    if (config.body) {
      config.headers["Content-Length"] = Buffer.byteLength(
        JSON.stringify(config.body)
      )
    }

    if (config.auth) {
      config.headers["Authorization"] = `Bearer ${config.auth}`
    }

    const options: RequestOptions = {
      host: parsedUrl.hostname,
      path: `${parsedUrl.pathname}${
        config.search ? `?${new URLSearchParams(config.search).toString()}` : ""
      }`,
      protocol: "https:",
      method: config.method,
      headers: config.headers,
    }
    let data = ""
    let req = https.request(options, (res) => {
      res.on("data", (chunk) => {
        data += chunk
      })

      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode <= 299) {
          try {
            resolve(JSON.parse(data))
          } catch {
            resolve(data as T)
          }
        } else {
          reject(data)
        }
      })
    })

    req.on("error", reject)
    if (config.body) {
      req.write(JSON.stringify(config.body))
    }
    req.end()
  })
}

export const DEFAULT_SCOPES: TokenScope[] = [
  "playlist-read-collaborative",
  "user-follow-read",
  "user-library-read",
  "user-top-read",
  "user-read-recently-played",
  "user-modify-playback-state",
]

export const _librespotModule: LibrespotModule = bindings("librespot.node")
