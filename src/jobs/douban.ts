import SpiderJob, { initCluster, timer } from "./SpiderJob"
import { getNamedLogger } from "../lib/log"
import { add, check } from "../lib/store"

// 创建任务
let spider: SpiderJob
const log = getNamedLogger("douban")

type doubanMeta = { name: string; point: string; link: string }

async function doubanHot() {
  // 爬
  const [getDoubanHot] = await spider.batch(async ({ page }) => {
    // 打开豆瓣电影首页
    await page.goto("https://movie.douban.com/")

    // douban是前端渲染的动态网页
    await page.waitForSelector(".cover-wp")

    // 默认情况下，首页显示的就是热门电影
    // TODO 第一页还不够，改成整体抽取出来
    return await page.$$eval(
      "div.gaia-movie div.slide-container > div.slide-wrapper > div[data-index='0'] > a",
      (el) => {
        let hots: doubanMeta[] = []
        el.forEach((it) => {
          const [name, point] = it.querySelector("p")?.innerText?.split(" ") || []
          if (+point >= 7 && name) {
            hots.push({
              name,
              point,
              link: it.href
            })
          }
        })
        return hots
      }
    )
  })


  // 执行
  const result = await getDoubanHot()


  log.notice(
    `豆瓣超7分电影找到 ${result.length} 部`
  )

  return result
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
      await page.goto("https://www.bt-tt.com/")


      await page.waitForSelector('input#search-keyword')

      // 输入搜索关键字
      await page.$eval(
        "input#search-keyword",
        (el, movie) => {
          el.value = movie
        },
        movie
      )

      await Promise.all([
        // 302跳转
        page.waitForNavigation(),
        // 触发搜索
        page.click("#pc_so > form > input.sub"),
      ])

      log.info(t())

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
          log.error(`${movie} 查询失败`)
          return []
        })

      if (!href && movie.length > 1) {
        // 搜索错误，尝试减少关键字继续搜索
        log.info(`尝试减少关键字继续搜索`)
        return searchEnter({ original, current: movie.slice(0, -1) })
      }

      if (!mName.startsWith(original)) {
        log.info(`${original} 无匹配 ${original} -> ${mName}`)
        return
      }

      log.info(`${original} 最佳匹配 ${movie} -> ${mName} ${href}`)

      await page.goto(href, { waitUntil: "domcontentloaded" })

      // 找出下载链接
      const downloadLink = await page.$$eval("a", (it) => {
        for (const a of it) {
          if (a.href.startsWith("magnet")) {
            return a.href
          }
        }
      })

      log.info(`${original} download ${downloadLink}`)

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



async function start() {
  // 初始化 cluster
  const cluster = await initCluster()
  spider = new SpiderJob({ cluster })

  try {
    log.notice("任务开始")
    // 找出页面中的热门电影
    let hots = await doubanHot()

    if (hots.length > 0) {
      // step 2 过滤出新的电影
      hots = hots.filter(async (it) => !await check(it.name))
      log.notice(`新电影有 ${hots.length} 部`)

      if (hots.length > 0) {
        // step 3
        await search(hots)
      }
    }
  } catch (err: any) {
    log.error(err.message)
  } finally {
    spider.close()
  }
}

export default start
