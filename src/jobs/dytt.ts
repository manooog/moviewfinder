/**
 * 电影天堂自动脚本
 */

import { getNamedLogger } from "../lib/log"
import { add, check } from "../lib/store"
import SpiderJob, { initCluster } from "./SpiderJob"
import { MovieMeta } from "../types"
import getConfig from "../lib/config"

const log = getNamedLogger("dytt")

let spider: SpiderJob
const config = getConfig()

/**
 * 在网页内匹配评分
 */
export function getCount(
  content: string
): [boolean, { douban: number; imdb: number }] {
  function getTypeCount(pre: string) {
    const str = content.match(new RegExp(`${pre}.*?(?=<br>)`))
    return str ? Number((str[0].match(/(\.|[0-9])+(?=\/10)/) || [])[0]) : 0
  }
  const rs = {
    douban: getTypeCount("豆瓣评分"),
    imdb: getTypeCount("IMDb评分"),
  }
  return [
    // 大于7
    Object.values(rs).some((v) => v > 7),
    rs,
  ]
}

async function findSomething(movies: MovieMeta[]) {
  // 过滤出需要添加的

  let newerMovies: MovieMeta[] = []

  for (const it of movies) {
    if (await check(it.title)) {
      continue
    }

    newerMovies.push(it)
  }

  // 打开电影内页
  if (newerMovies.length > 0) {
    log.notice(
      `新电影有 ${newerMovies.length} 部`
    )
    const [executeMovie] = await spider.batch(async ({ page, data }) => {
      await page.goto((data as MovieMeta).href, {
        waitUntil: "domcontentloaded",
      })
      const content = await page.content()

      const [needDownload, rs] = getCount(content)

      let downloadMeta
      if (needDownload) {
        // 超过 7分才进行下载

        log.notice(
          `${(data as MovieMeta).title} douban@${rs.douban} imdb@${rs.imdb}`
        )
        // 下一步
        const downloadURL = content.match(/magnet.*?(?=")/)

        if (downloadURL) {
          const downloadURLStr = downloadURL[0]
          // 将链接发给 aria2
          downloadMeta = {
            ...(data as MovieMeta),
            download: [downloadURLStr],
          }


        }
      }

      return downloadMeta

    })
    // 批量打开
    newerMovies.map(async (movie) => {
      const meta = await executeMovie(movie)
      meta && await add(meta)
    })
  }
}

async function startInEntry() {
  log.notice("任务开始")
  const [executeTask] = await spider.batch(async ({ page, data: url }) => {
    await page.goto(url as string)

    await page.waitForSelector(".co_content8")

    const filterdMovies = await page.$eval(".co_content8", (dom) => {
      const aLinks = dom.querySelectorAll("a")
      let movies: MovieMeta[] = []
      const thisIsNotMovie = ["最新", "手机浏览"]
      for (const item of Array.from(aLinks)) {
        if (
          !~thisIsNotMovie.findIndex((pre) => item.innerHTML.includes(pre))
        ) {
          // 确定是电影链接
          const m = item.innerHTML.match(/《(.*?)》/)

          if (!m) continue

          movies.push({
            // 豆瓣电影名
            title: m[1],
            href: item.href,
            download: [],
          })
        }
      }
      return movies
    })

    log.notice(
      `共发现 ${filterdMovies.length} 部电影`
    )

    return filterdMovies
  })

  return await executeTask(config.dytt.entey)
}

async function start() {
  // 初始化 cluster
  const cluster = await initCluster()
  spider = new SpiderJob({ cluster })

  try {
    const movies = await startInEntry()
    if (movies.length > 0) {
      await findSomething(movies)
    }
  } catch (err: any) {
    log.error(err.message)
  } finally {
    spider.close()
  }
}

export default start
