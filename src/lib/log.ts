import { resolve } from "node:path"

import winston from "winston"

const logger = winston.createLogger({
  levels: winston.config.syslog.levels,
  format: winston.format.combine(
    winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    winston.format.json()
  ),
  transports: [
    //
    // - Write all logs with importance level of `error` or less to `error.log`
    // - Write all logs with importance level of `info` or less to `combined.log`
    //
    new winston.transports.File({
      filename: resolve(process.cwd(), "config/log/error.log"),
      level: "error",
    }),
    new winston.transports.File({
      filename: resolve(process.cwd(), "config/log/combined.log"),
    }),
  ],
})

function getNamedLogger(name: string) {
  return logger.child({ moduleName: name })
}

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.printf(
        ({ level, message, timestamp, moduleName = "default" }) => {
          return `[${timestamp} ${moduleName}] ${level} ${message}`
        }
      ),
    })
  )
}

export { logger, getNamedLogger }
