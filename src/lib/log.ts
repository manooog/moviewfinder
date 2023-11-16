import { resolve } from "node:path"

import winston from "winston"

const format = winston.format.printf(
  ({ level, message, timestamp, moduleName = "default" }) => {
    return `[${timestamp} ${moduleName}] ${level} ${message}`
  }
)

const logger = winston.createLogger({
  levels: winston.config.syslog.levels,
  format: winston.format.combine(
    winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: resolve(process.cwd(), "config/log/error.log"),
      level: "error",
      format
    }),
    new winston.transports.File({
      filename: resolve(process.cwd(), "config/log/combined.log"),
      format
    }),
    new winston.transports.Console({
      format,
    })
  ],
})

function getNamedLogger(name: string) {
  return logger.child({ moduleName: name })
}

export { logger, getNamedLogger }
