import https, { RequestOptions } from "https"

interface Config {
  method: "GET" | "POST" | "PUT"
  body?: Record<string, unknown>
  headers?: Record<string, string | string[] | number>
  search?: Record<string, string>
}

export function fetch<T>(url: string, config: Config): Promise<T> {
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

    console.log(
      parsedUrl.pathname +
        (config.search
          ? `?${new URLSearchParams(config.search).toString()}`
          : "")
    )

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
        resolve(data as any)
        // console.log(resolve(JSON.parse(data)))
      })
    })

    req.on("error", reject)
    if (config.body) {
      req.write(JSON.stringify(config.body))
    }
    req.end()
  })
}
