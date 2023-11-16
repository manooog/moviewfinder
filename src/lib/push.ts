/**
 * 下载推送任务单独执行
 */

import dayjs from "dayjs"
import { addDownload } from "./aria2"
import { logger } from "./log"
import { readStore } from "./store"
import { MovieMeta } from "../types"

let successList: string[] = []
let startTime = dayjs()

function getDownlink(meta: MovieMeta) {
  const { download } = meta

  for (const it of download) {
    if (typeof it === "string") {
      return it
    } else {
      return it.url
    }
  }
  return ""
}

export async function startDownload() {
  logger.debug('开始下载任务')
  const content = await readStore()
  // 过滤出需要下载的资源
  const newerList = content.filter(
    (it) =>
      !successList.includes(it.title) &&
      // undefined 会被初始化为当前时间
      dayjs(it.createTime || 0).isAfter(startTime)
  )
  if (newerList.length > 0) {
    // 一次添加多个
    const res = await addDownload(newerList.map(getDownlink).filter(Boolean))
    if (res) {
      // 记录
      successList = successList.concat(newerList.map((it) => it.title))
      logger.notice(`推送成功 ${successList.join("、")}`)
    }
  } else {
    logger.notice('没有新的内容')
  }
}

export const intervalCheck = async () => {
  await startDownload()
  setInterval(() => {
    startDownload()
  }, 1 * 60 * 1000)
}
