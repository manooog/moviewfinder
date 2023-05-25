import { resolve } from "path"
import { Config } from "../types"
import { readFileSync, existsSync } from "fs"
import { logger } from "./log"
let config: Config

const configFilePath = resolve(process.cwd(), "config/config.json")
export default function getConfig() {
  if (!config) {
    try {
      config = JSON.parse(readFileSync(configFilePath, { encoding: "utf-8" }))
    } catch (error) {
      logger.error(
        `${error} please try:\n1、create config file\n2、check if the config file is a valid json`
      )

      process.exit()
    }
  }

  return config
}
