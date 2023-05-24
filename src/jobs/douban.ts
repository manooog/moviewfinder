import SpiderJob, { timer } from "./SpiderJob"
import { getNamedLogger } from "../lib/log"
import { add, check } from "../lib/store"

// 创建任务
const spider = new SpiderJob()
const logger = getNamedLogger("douban_hot")

type doubanMeta = { name: string; point: string; link: string }

async function doubanHot() {
  // 爬
  const [getDoubanHot] = await spider.batch(async ({ page }) => {
    // 打开豆瓣电影首页
    await page.goto("https://movie.douban.com/", {
      waitUntil: "domcontentloaded",
    })

    // douban是前端渲染的动态网页
    await page.waitForSelector(".cover-wp")

    // 默认情况下，首页显示的就是热门电影
    return await page.$$eval(
      "div.gaia-movie div.slide-container > div.slide-wrapper > div[data-index='0'] > a",
      (el) => {
        return el.map((it) => {
          /**
         * [
              ' 千寻小姐 7.9',
              'https://movie.douban.com/subject/35791966/?tag=%E7%83%AD%E9%97%A8&from=gaia'
            ]
         */
          return [it.querySelector("p")?.innerText, it.href]
        })
      }
    )
  })
  // 执行
  const result = await getDoubanHot()

  let hots: doubanMeta[] = []

  if (Array.isArray(result)) {
    hots = result.reduce((pre, cur) => {
      if (
        !pre.find((it) => it.link === cur[1]) &&
        cur.every((it) => it !== undefined)
      ) {
        const [name, point] = cur[0]?.split(" ") || []
        if (+point > 7) {
          pre.push({ name, point, link: cur[1] || "" })
        }
      }

      return pre
    }, [] as doubanMeta[])
  }

  logger.notice(
    `total*${hots.length} ${hots
      .map((it) => `${it.name}@${it.point}`)
      .join("、")}`
  )

  return hots
}

/**
 * dy-tt 搜索
 */
async function search(hots: doubanMeta[]) {
  // @ts-ignore
  const [searchEnter] = await spider.batch<{
    original: string
    current?: string
  }>(
    // @ts-ignore
    async ({ page, data: { original, current } }) => {
      const movie = current || original
      // 使用电影名发起搜索
      const t = timer(`${movie} search`)
      // 打开dy-tt 首页
      await page.goto("https://www.bt-tt.com/", {
        waitUntil: "domcontentloaded",
      })

      // 输入搜索关键字
      await page.$eval(
        "input#search-keyword",
        (el, movie) => {
          el.value = movie
        },
        movie
      )
      // click 和 waitFor 写到一起，可以明显提高成功率!!!
      await Promise.all([
        // 302跳转
        page.waitForNavigation(),
        // 触发搜索
        page.click("#pc_so > form > input.sub"),
      ])

      logger.info(t())

      // 选第一个
      // TODO 搜索结果可能并不是自己想要的
      const [href, mName] = await page
        .$eval(".container a", (el) => {
          const movieName = (el.querySelector("img")?.alt || "").replace(
            /<.*?>/g,
            ""
          )

          return [el.href, movieName]
        })
        .catch((_) => {
          // 这里出现错误，可能是由于网站限制了某些搜索字段导致
          // -> 尝试使用部分关键字进行再次搜索
          logger.error(`${movie} 查询失败`)
          return []
        })

      if (!href && movie.length > 1) {
        // 搜索错误，尝试减少关键字继续搜索
        logger.info(`尝试减少关键字继续搜索`)
        return searchEnter({ original, current: movie.slice(0, -1) })
      }

      if (!mName.startsWith(original)) {
        logger.info(`${original} 无匹配 ${original} -> ${mName}`)
        return
      }

      logger.info(`${original} 最佳匹配 ${movie} -> ${mName} ${href}`)

      await page.goto(href, { waitUntil: "domcontentloaded" })

      // 找出下载链接
      const downloadLink = await page.$$eval("a", (it) => {
        for (const a of it) {
          if (a.href.startsWith("magnet")) {
            return a.href
          }
        }
      })

      logger.info(`${original} download ${downloadLink}`)

      if (downloadLink && !(await check(original))) {
        // 写入
        await add({
          title: original,
          href,
          download: [downloadLink],
        })
      }
    }
  )

  // 任务同步执行，但是需要等所有任务执行完毕才进入下一步
  await Promise.all(hots.map(({ name }) => searchEnter({ original: name })))
}

export async function doubanJobEntry() {
  try {
    logger.notice("start")
    // step 1
    let hots = await doubanHot()
    if (hots.length !== 0) {
      // step 2 过滤
      hots = hots.filter(async (it) => await check(it.name))
      for (let index = hots.length - 1; index >= 0; index--) {
        const { name } = hots[index]
        if (await check(name)) {
          // 已存在，过滤掉
          hots.splice(index, 1)
        }
      }

      logger.notice(`new*${hots.length}`)
      // step 3
      await search(hots)
    }
  } catch (error) {
    logger.error("爬取错误，下次重试", error)
  } finally {
    logger.notice("complete")
    // 结束任务，必须手动结束否则程序不会退出
    await spider.close()
  }
}

if (process.env.IS_VSCODE_DEBUGGER) {
  doubanJobEntry()
}
