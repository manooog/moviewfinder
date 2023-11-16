import { Dayjs } from "dayjs";

export type MovieMeta = {
  title: string
  href: string
  download: (string | { type: "1080" | "4k"; url: string })[]

  createTime?: Dayjs
}

export type Config = any