import { addDownload } from "../src/lib/aria2"

test("add aria2 download link.", async () => {
  const res = await addDownload(["https://xxx"])

  expect(res).toBe(true)
})
