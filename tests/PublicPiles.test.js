import { Deck } from "../src/strawberry_jam/Deck.js"
import { PublicPiles } from "../src/strawberry_jam/PublicPiles.js"

import { DiscordUserMock } from "./DiscordUserMock.js"

describe('PublicPile Tests', () => {
  test("PublicPile Construct", () => {
    const deck = new Deck()
    let piles = new PublicPiles(deck, 4, {})

    expect(piles._piles.length).toBe(2)
  })

  test("PublicPile Update", () => {
    const deck = new Deck()
    let piles = new PublicPiles(deck, 4, {})

    {
      const depleted_piles = piles.update(deck, [1])
      expect(depleted_piles.length).toBe(0)
    }
    {
      const depleted_piles = piles.update(deck, [7])
      expect(depleted_piles.length).toBe(0)
    }
    {
      const depleted_piles = piles.update(deck, [5, 6])
      expect(depleted_piles.length).toBe(0)
    }

    const num_cards_in_pile_0 = piles._piles[0].length
    for (let ii = 0; ii < num_cards_in_pile_0 - 1; ii++) {
      piles.update(deck, [5])
    }
    {
      expect(piles._clues[0]).toBe(1)
      const depleted_piles = piles.update(deck, [5, 6])
      expect(depleted_piles).toStrictEqual([5])
      expect(piles._clues[0]).toBe(0)
    }
  })
})