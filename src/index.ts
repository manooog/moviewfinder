import { CronJob } from "cron"
import process from "node:process"
import { doubanJobEntry } from "./jobs/douban"
import dyttJobEntry from "./jobs/dytt"
import { logger } from "./lib/log"
import { startDownload } from "./lib/push"

logger.notice("script start")

startDownload()

function startJobs() {
  dyttJobEntry()
  doubanJobEntry()
}

if (process.env.START_ON_ENTER) {
  startJobs()
}

const job = new CronJob("0 0 11 * * *", () => {
  startJobs()
})

job.start()
