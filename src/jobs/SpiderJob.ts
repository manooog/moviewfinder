import { Page } from "puppeteer"
import { Cluster } from "puppeteer-cluster"
import { TaskFunction } from "puppeteer-cluster/dist/Cluster"

export async function setPageForCrawle(page: Page) {
  await page.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36"
  )
  // 增加拦截，不要下载图片，缩减流量消耗
  await page.setRequestInterception(true)
  page.on("request", (request) => {
    if (request.url().endsWith(".jpg")) {
      request.abort()
    } else {
      request.continue()
    }
  })
}

export function timer(label: string) {
  const init = +new Date()
  let count = 0
  return () => {
    const now = +new Date()
    count += 1
    return [label, count, (now - init) / 1000, "s"].join(" ")
  }
}

type Options = {
  setPageMethod?: any
}

export default class SpiderJob {
  constructor(options: Options = {}) {
    this.options = {
      ...options,
      setPageMethod: setPageForCrawle,
    }
  }

  private options: Options
  private cluster: Cluster | null = null

  private init = async () => {
    this.cluster = await Cluster.launch({
      concurrency: Cluster.CONCURRENCY_PAGE,
      maxConcurrency: 5,
      retryLimit: 5,
    })
  }

  private getCluster = async () => {
    if (!this.cluster) {
      await this.init()
    }
    return this.cluster as Cluster
  }

  batch = async <T = any, D = any>(
    task: TaskFunction<T, D>
  ): Promise<[(param?: T) => Promise<D>, any]> => {
    const cluster = await this.getCluster()
    cluster.task(async (data) => {
      await this.options?.setPageMethod(data.page)
      return await task(data)
    })
    cluster.on("taskError", (err, data, willRetry) => {
      if (willRetry) {
        console.warn(
          `Encountered an error while crawling ${data}. ${err.message}\nThis job will be retried`
        )
      } else {
        console.error(`Failed to crawl ${data}: ${err.message}`)
      }
    })
    return [
      (d?: T): Promise<D> => {
        return cluster.execute(d)
      },
      async () => {
        await cluster.idle()
      },
    ]
  }

  close = async () => {
    if (!this.cluster) return

    await this.cluster.idle()
    await this.cluster.close()

    this.cluster = null
  }
}
