import { Deck } from "../src/strawberry_jam/Deck.js"
import { BonusCards } from "../src/strawberry_jam/BonusCards"
import { DiscordUserMock } from "./DiscordUserMock.js"

describe('BonusCards Tests', () => {
  test("BonusCards Construct", () => {
    const bonus_cards = new BonusCards()
    expect(bonus_cards.num()).toBe(0)
    expect(bonus_cards.wild_user()).toBe(null)
    expect(bonus_cards.users()).toStrictEqual([])
  })

  test("BonusCards Add Remove", () => {
    const bonus_cards = new BonusCards()
    expect(bonus_cards.num()).toBe(0)
    bonus_cards.add('a')
    expect(bonus_cards.num()).toBe(1)
    bonus_cards.add('a')
    expect(bonus_cards.num()).toBe(2)
    bonus_cards.add('b')
    expect(bonus_cards.num()).toBe(3)

    expect(bonus_cards.get(0)).toStrictEqual({ card: 'a', user: null })
    expect(bonus_cards.get(1)).toStrictEqual({ card: 'a', user: null })
    expect(bonus_cards.get(2)).toStrictEqual({ card: 'b', user: null })

    expect(() => bonus_cards.get(3)).toThrowError()

    const deck = new Deck()

    expect(() => bonus_cards.remove_by_index(deck, 3)).toThrowError()
    expect(() => bonus_cards.remove_by_index(deck, -1)).toThrowError()
    expect(() => bonus_cards.remove_by_index(deck, 1)).not.toThrowError()
    expect(bonus_cards.num()).toBe(2)
    expect(bonus_cards.get(0)).toStrictEqual({ card: 'a', user: null })
    expect(bonus_cards.get(1)).toStrictEqual({ card: 'b', user: null })


  })

  test("BonusCards Assign To User", () => {
    const bonus_cards = new BonusCards()
    bonus_cards.add('a')
    bonus_cards.add('a')
    bonus_cards.add('b')
    expect(bonus_cards.num()).toBe(3)

    const deck = new Deck()
    const discord_user = new DiscordUserMock()

    {
      const { success } = bonus_cards.assign_to_user([0, 3], false, discord_user)
      expect(success).toBe(false)
    }

    {
      const { success } = bonus_cards.assign_to_user([-1], false, discord_user)
      expect(success).toBe(false)
    }

    {
      const { success } = bonus_cards.assign_to_user([0, 2], false, discord_user)
      expect(success).toBe(true)
    }

    {
      const { success } = bonus_cards.assign_to_user([0, 3], false, discord_user)
      expect(success).toBe(false)

      {
        const { card, user } = bonus_cards.get(0)
        expect(user?.id === discord_user.id)
      }
      {
        const { card, user } = bonus_cards.get(2)
        expect(user?.id === discord_user.id)
      }
    }

    {
      const { success } = bonus_cards.assign_to_user([1, 2], false, discord_user)
      expect(success).toBe(true)
      {
        const { card, user } = bonus_cards.get(0)
        expect(user === null)
      }
      {
        const { card, user } = bonus_cards.get(1)
        expect(user?.id === discord_user.id)
      }
      {
        const { card, user } = bonus_cards.get(2)
        expect(user?.id === discord_user.id)
      }
    }

    const discord_user_2 = new DiscordUserMock()
    {
      const { success } = bonus_cards.assign_to_user([1], false, discord_user_2)
      expect(success).toBe(false)
    }
    {
      const { success } = bonus_cards.assign_to_user([0], true, discord_user_2)
      expect(success).toBe(true)
      expect(bonus_cards.wild_user().id === discord_user_2.id)
    }

    {
      const { success } = bonus_cards.assign_to_user([], true, discord_user)
      expect(success).toBe(false)
      {
        const { card, user } = bonus_cards.get(1)
        expect(user?.id === discord_user.id)
      }
      {
        const { card, user } = bonus_cards.get(2)
        expect(user?.id === discord_user.id)
      }
      expect(bonus_cards.wild_user()?.id !== discord_user.id)
    }

    {
      const { success } = bonus_cards.assign_to_user([0], false, discord_user_2)
      expect(success).toBe(true)
      expect(bonus_cards.wild_user()?.id !== discord_user_2.id)
    }
  })

  test("BonusCards Update", () => {
    const bonus_cards = new BonusCards()
    bonus_cards.add('a')
    bonus_cards.add('a')
    bonus_cards.add('b')
    expect(bonus_cards.num()).toBe(3)

    const deck = new Deck()

    expect(() => bonus_cards.update(deck, [10])).toThrowError()
    {
      const { success, ...rest } = bonus_cards.update(deck, [8])
      expect(success).toBe(true)
      expect(rest.consumed_letters).toStrictEqual(['a'])
      expect(bonus_cards.num()).toBe(2)
    }
    expect(() => bonus_cards.update(deck, [9])).toThrowError()
  })
})

