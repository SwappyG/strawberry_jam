import { Clues } from "../src/strawberry_jam/Clues.js"

describe('Clues Tests', () => {
  test.each([4, 5, 6])("Clues Construct for %j", (val) => {
    let clues = new Clues(val)
    expect(clues.remaining()).toBe(10)
    expect(clues.locked()).toBe(1)
  })

  test.each([1, 2, 3])("Clues Construct for %j", (val) => {
    let clues = new Clues(val)
    expect(clues.remaining()).toBe(8)
    expect(clues.locked()).toBe(3)
  })

  test.each([1, 2, 3, 4, 5, 6])("Clues Update", (val) => {
    let clues = new Clues(val)
    clues.update(Array(val).fill(0))
    expect(clues.locked()).toBe(val <= 3 ? 3 : 1)

    const remaining_before = clues.remaining()
    const locked_before = clues.locked()
    clues.update(Array(val).fill(Math.floor(6 / val)))
    expect(clues.locked()).toBe(0)
    expect(clues.remaining()).toBe(remaining_before + locked_before)
  })

  test("Clues Incr, Decr", () => {
    let clues = new Clues(6)

    const remaining_before = clues.remaining()
    clues.increment(4)
    expect(clues.remaining()).toBe(remaining_before + 4)
    clues.increment(4)
    expect(clues.remaining()).toBe(remaining_before + 8)
    clues.decrement(2)
    expect(clues.remaining()).toBe(remaining_before + 6)
    clues.decrement(6)
    expect(clues.remaining()).toBe(remaining_before)
  })
})