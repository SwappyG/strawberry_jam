import minimist from "minimist"
import { parseArgsStringToArgv } from 'string-argv'

describe('Minimist Tests', () => {
  test("Minimist Parse Test", () => {
    const args = minimist(parseArgsStringToArgv("play --test \"\""))
    expect(typeof args.test === 'string').toBe(true)
  })
})