import fetch from "node-fetch"
import { v4 } from "uuid"
import { getNamedLogger } from "./log"
import getConfig from "./config"

const config = getConfig()
const log = getNamedLogger('aria2')

/**
 * 下载
 * @param urls 链接
 */
export async function addDownload(urls: string[]) {
  log.notice("开始推送", urls)
  try {
    const res = await fetch(config.aria2.rpc, {
      method: "POST",
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "aria2.addUri",
        id: v4(),
        params: [
          `token:${config.aria2.token}`,
          urls,
          { dir: config.aria2.destDir },
        ],
      }),
      headers: { "Content-Type": "application/json" },
    })

    if (res.status === 200) {
      return true
    } else {
      log.error(`推送失败 ${res.status} ${await res.text()}`)
      return false
    }
  } catch (error: any) {
    log.error(`请求失败 ${error?.message}`)
    return false
  }
}
