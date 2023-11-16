import { addDownload } from "../src/lib/aria2"
import { startDownload } from "../src/lib/push"
import startDytt from "../src/jobs/dytt"
import startDouban from "../src/jobs/douban"

test("推送aria2", async () => {
  // 可以修改 config/config.json 里面与 aria2 相关的配置，进行其他场景的测试
  const res = await addDownload(["https://abc.com"])

  expect(res).toBe(true)
})


test("检查 movie 文件，判断是否需要推送到aria2进行下载", async () => {
  const res = await startDownload()

  expect(res).toBe(undefined)
})

// test("爬取电影天堂数据", async () => {
//   const res = await startDytt()
//   expect(res).toBe(undefined)
// }, 20 * 60 * 1000)


test("爬取豆瓣电影数据", async () => {
  const res = await startDouban()
  expect(res).toBe(undefined)
}, 20 * 60 * 1000)