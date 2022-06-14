import { Deck } from "../src/strawberry_jam/Deck.js"

describe('Deck Tests', () => {
  test("Deck Construct", () => {
    const deck = new Deck()
    expect(deck.size()).toBe(64)
    expect(deck.size() + deck.discard_size()).toBe(64)
  })

  test("Deck Copy", () => {
    const deck = new Deck()
    const deck2 = deck.copy()
    deck.draw_cards(5)

    expect(deck.size()).toBe(59)
    expect(deck2.size()).toBe(64)
  })

  test("Deck Draw", () => {
    const deck = new Deck()
    const cards = deck.draw_cards(5)
    expect(cards.length).toBe(5)
    expect(deck.size()).toBe(59)

    const expected_cards = new Deck().cards().sort()
    const all_cards = deck.cards().concat(cards).sort()
    for (const [a, b] of expected_cards.map((c, ii) => [c, all_cards[ii]])) {
      expect(a).toBe(b)
    }
  })

  test("Deck Draw Specific", () => {
    const deck = new Deck()
    const invalid_cards = ['v', 'z', 'j', 'x', 'q'].sort().join("")
    const missing_cards = deck.draw_specific_cards(invalid_cards)
    expect(missing_cards.length).toBe(5)
    expect(missing_cards.sort().join("")).toStrictEqual(invalid_cards)

    expect(deck.draw_specific_cards('aa')).toStrictEqual([])
    expect(deck.size()).toBe(62)
    expect(deck.draw_specific_cards('aa')).toStrictEqual([])
    expect(deck.size()).toBe(60)
    expect(deck.draw_specific_cards('aa')).toStrictEqual(['a', 'a'])
    expect(deck.size()).toBe(60)

    expect(deck.draw_specific_cards('aa', 'aa')).toStrictEqual([])
    expect(deck.size()).toBe(60)

    expect(deck.draw_specific_cards('bb', 'aa')).toStrictEqual([])
    expect(deck.size()).toBe(60)

    expect(deck.draw_specific_cards('aa')).toStrictEqual([])
    expect(deck.size()).toBe(58)
  })

  test("Deck Draw and Discard", () => {
    const deck = new Deck()
    const missing_cards = deck.draw_specific_cards('abcd')
    expect(missing_cards.length).toBe(0)
    expect(deck.size()).toBe(60)

    let cards = deck.draw_cards(59)
    expect(cards.length).toBe(59)
    expect(deck.size()).toBe(1)
    expect(deck.discard_size()).toBe(0)

    expect(() => { deck.draw_cards(2) }).toThrowError()

    deck.discard(cards)
    expect(deck.discard_size()).toBe(59)

    cards = deck.draw_cards(2)
    expect(deck.size()).toBe(58)
    expect(deck.discard_size()).toBe(0)
    expect(cards.length).toBe(2)

    deck.discard('abcd'.split(""))
    expect(deck.discard_size()).toBe(4)
  })
})

