/**
 * 将获取到的信息存储起来
 */

import dayjs, { Dayjs } from "dayjs"
import { readFile, writeFile } from "fs/promises"
import { resolve } from "path"
import { getNamedLogger } from "./log"
import { MovieMeta } from "../types"
import { existsSync } from "fs"

const logger = getNamedLogger("store")

const cacheDir = resolve(process.cwd(), "config")
const cacheFile = resolve(cacheDir, "movie.json")

export async function add(meta: MovieMeta | MovieMeta[]) {
  // storetype
  // check
  let _meta: MovieMeta[] = []
  if (!Array.isArray(meta)) {
    _meta = [meta]
  } else {
    _meta = meta
  }

  for (const it of _meta) {
    if (await check(it.title)) {
      logger.notice(`exists ${it.title}`)
      return
    }
    await write(it)
  }
}

/**
 * 检查存储库里是否包含了
 * 有 -> true，没有 -> false
 */
export async function check(title: string) {
  const file = await readStore()
  // 别名 鲸/我的鲸鱼老爸
  return file.some((it) =>
    it.title.split("/").some((_it) => title.split("/").includes(_it))
  )
}

export async function write(meta: MovieMeta) {
  if (!meta.createTime) meta.createTime = dayjs()
  let content = await readStore()
  content.push(meta)
  // 长度限制 100个
  content = content.slice(-100)
  try {
    await writeFile(cacheFile, JSON.stringify(content), {
      encoding: "utf-8",
    })
    logger.notice(`writefile done ${meta.title}`)
  } catch (error) {
    logger.error(`writefile ${cacheFile} error!`)
  }
}

export async function readStore() {
  let content: MovieMeta[] = []
  try {
    if (!existsSync(cacheFile)) {
      await writeFile(cacheFile, JSON.stringify([]), { encoding: "utf-8" })
    }
    const cacheStr = await readFile(cacheFile, { encoding: "utf-8" })
    content = JSON.parse(cacheStr)
  } catch (error) {
    logger.error(`readfile ${cacheFile} error: ${error}`)
  }

  return content
}
