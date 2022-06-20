import { Deck } from "../src/strawberry_jam/Deck.js"
import { BonusCards } from "../src/strawberry_jam/BonusCards.js"
import { Player } from "../src/strawberry_jam/Player.js"
import { PLAYER_STATE } from "../src/strawberry_jam/PlayerState.js"

import { DiscordUserMock } from "./DiscordUserMock.js"

describe('Player Tests', () => {
  test("Player Construct", () => {
    const discord_user = new DiscordUserMock()
    const length_of_words = 5

    expect(() => new Player({ discord_user })).toThrowError()
    expect(() => new Player({ length_of_words })).toThrowError()

    let player = new Player({ discord_user, length_of_words })

    expect(player.state).toBe(PLAYER_STATE.CHOOSING_WORD)
    expect(player.is_ready()).toBe(false)
    expect(player.is_waiting_for_assigned_word()).toBe(false)
    expect(player.is_giving_hint()).toBe(false)
    expect(player.is_choosing_word()).toBe(true)
    expect(player.is_responding_to_hint()).toBe(false)
  })

  test("Player Set Word", () => {
    const discord_user = new DiscordUserMock()
    const length_of_words = 5
    const player = new Player({ discord_user, length_of_words })
    let deck = new Deck()

    {
      const { success, ...rest } = player.set_word_from_deck(deck, 'wert')
      expect(success).toBe(false)
      expect(deck.size()).toBe(64)
    }
    {
      const { success, ...rest } = player.set_word_from_deck(deck, 'er234')
      expect(success).toBe(false)
      expect(deck.size()).toBe(64)
    }

    {
      const { success, ...rest } = player.set_word_from_deck(deck, '12345')
      expect(success).toBe(false)
      expect(deck.size()).toBe(64)
    }
    {
      const { success, ...rest } = player.set_word_from_deck(deck, 'asdfz')
      expect(success).toBe(false)
      expect(deck.size()).toBe(64)
    }
    {
      const { success, ...rest } = player.set_word_from_deck(deck, 'asdfas')
      expect(success).toBe(false)
      expect(deck.size()).toBe(64)
    }
    {
      const { success, ...rest } = player.set_word_from_deck(deck, 'kayak')
      expect(success).toBe(true)
      expect(rest.deck.size()).toBe(59)
      deck = rest.deck
    }
    {
      const { success, ...rest } = player.set_word_from_deck(deck, 'gecko')
      expect(success).toBe(true)
      expect(rest.deck.size()).toBe(59)
    }
  })

  test("Player Ready to Start", () => {
    const discord_user = new DiscordUserMock()
    const length_of_words = 5
    const player = new Player({ discord_user, length_of_words })
    const deck = new Deck()

    {
      const { success, ...rest } = player.set_word_from_deck(deck, 'kayak')
      expect(success).toBe(true)
      expect(rest.deck.size()).toBe(59)
    }

    expect(player.state).toBe(PLAYER_STATE.READY_TO_START)
    expect(player.is_ready()).toBe(false)
    expect(player.is_waiting_for_assigned_word()).toBe(true)
    expect(player.is_giving_hint()).toBe(false)
    expect(player.is_choosing_word()).toBe(false)
    expect(player.is_responding_to_hint()).toBe(false)
  })

  test("Player Assign Word", () => {
    const discord_user = new DiscordUserMock()
    const length_of_words = 5
    const player = new Player({ discord_user, length_of_words })
    const new_deck = new Deck()

    {
      const { success, ...rest } = player.set_word_from_deck(new_deck, 'kayak')
      expect(success).toBe(true)
      expect(rest.deck.size()).toBe(59)
    }

    {
      player.assign_word('hello', 1)
      expect(player.num).toBe(1)
      expect(player.assigned_word.split("").sort().join("")).toBe('hello'.split("").sort().join(""))
      expect(player.assigned_word_unshuffled).toBe('hello')
    }

    expect(player.state).toBe(PLAYER_STATE.READY)
    expect(player.is_ready()).toBe(true)
    expect(player.is_waiting_for_assigned_word()).toBe(false)
    expect(player.is_giving_hint()).toBe(false)
    expect(player.is_choosing_word()).toBe(false)
    expect(player.is_responding_to_hint()).toBe(false)
  })

  test("Player Give Hint", () => {
    const discord_user = new DiscordUserMock()
    const length_of_words = 5
    const player = new Player({ discord_user, length_of_words })
    let deck = new Deck()

    {
      const { success, ...rest } = player.set_word_from_deck(deck, 'kayak')
      expect(success).toBe(true)
      expect(rest.deck.size()).toBe(59)
    }

    {
      player.assign_word('hello', 1)
      expect(player.num).toBe(1)
      expect(player.assigned_word.split("").sort().join("")).toBe('hello'.split("").sort().join(""))
      expect(player.assigned_word_unshuffled).toBe('hello')
    }

    expect(player.get_active_letter()).toStrictEqual([player.assigned_word[0], 0])
    expect(player.get_active_hint()).toBe(null)

    player.give_hint()

    expect(player.state).toBe(PLAYER_STATE.GIVING_HINT)
    expect(player.is_ready()).toBe(false)
    expect(player.is_waiting_for_assigned_word()).toBe(false)
    expect(player.is_giving_hint()).toBe(true)
    expect(player.is_choosing_word()).toBe(false)
    expect(player.is_responding_to_hint()).toBe(false)

    expect(() => player.give_hint()).toThrowError()
    expect(() => player.receive_hint()).toThrowError()
    expect(() => player.make_final_guess()).toThrowError()

    {
      const { success } = player.pass()
      expect(success).toBe(false)
    }

    {
      const { success } = player.advance_to_next_letter(deck, 'A')
      expect(success).toBe(false)
    }

    {
      const { success } = player.guess_bonus(deck, 'A')
      expect(success).toBe(false)
    }

    expect(() => { player.round_complete() }).not.toThrowError()
  })

  test("Player Receive Hint", () => {
    const discord_user = new DiscordUserMock()
    const length_of_words = 5
    const player = new Player({ discord_user, length_of_words })
    let deck = new Deck()

    {
      const { success, ...rest } = player.set_word_from_deck(deck, 'kayak')
      expect(success).toBe(true)
      expect(rest.deck.size()).toBe(59)
    }

    {
      player.assign_word('hello', 1)
      expect(player.num).toBe(1)
      expect(player.assigned_word.split("").sort().join("")).toBe('hello'.split("").sort().join(""))
      expect(player.assigned_word_unshuffled).toBe('hello')
    }

    player.receive_hint('G*?SS?S')

    expect(player.state).toBe(PLAYER_STATE.RESPONDING_TO_HINT)
    expect(player.is_ready()).toBe(false)
    expect(player.is_waiting_for_assigned_word()).toBe(false)
    expect(player.is_giving_hint()).toBe(false)
    expect(player.is_choosing_word()).toBe(false)
    expect(player.is_responding_to_hint()).toBe(true)

    expect(() => player.give_hint()).toThrowError()
    expect(() => player.receive_hint()).toThrowError()
    expect(() => player.round_complete()).toThrowError()
    expect(() => player.make_final_guess()).toThrowError()

    {
      const { success } = player.pass()
      expect(success).toBe(true)
      expect(player.state).toBe(PLAYER_STATE.READY)
    }

    player.receive_hint('T?ST*NG')
    expect(player.get_active_hint()).toBe('T?ST*NG')
    expect(player.state).toBe(PLAYER_STATE.RESPONDING_TO_HINT)

    {
      const { success } = player.guess_bonus(deck, 'E')
      expect(success).toBe(false)
    }
    {
      const { success } = player.advance_to_next_letter(deck, 'E')
      expect(success).toBe(true)
    }

    expect(player.hints_received[0].length).toBe(2)
    expect(player.hints_received[0][0]).toBe('G*?SS?S')
    expect(player.hints_received[0][1]).toBe('T?ST*NG')

    expect(() => { player.round_complete() }).not.toThrowError()
  })

  test("Player Make Final Guess", () => {
    const discord_user = new DiscordUserMock()
    const length_of_words = 5
    const player = new Player({ discord_user, length_of_words })
    let deck = new Deck()

    {
      const { success, ...rest } = player.set_word_from_deck(deck, 'kayak')
      expect(success).toBe(true)
      expect(rest.deck.size()).toBe(59)
    }

    {
      player.assign_word('hello', 1)
      expect(player.num).toBe(1)
      expect(player.assigned_word.split("").sort().join("")).toStrictEqual('hello'.split("").sort().join(""))
      expect(player.assigned_word_unshuffled).toStrictEqual('hello')
    }

    const bonus_cards = new BonusCards()
    expect(player.make_final_guess(['1', '2', '3', '4'], bonus_cards).success).toBe(false) // missing index 5
    expect(player.make_final_guess(['1', '2', '3', '4', '6'], bonus_cards).success).toBe(false) // index 6 is invalid
    expect(player.make_final_guess(['1', '1', '2', '3', '4'], bonus_cards).success).toBe(false) // duplicate index 1
    expect(player.make_final_guess(['1', '5', '2', '3', '4', 'b7'], bonus_cards).success).toBe(false) // there is no bonus cards

    {
      const { success } = player.make_final_guess(['1', '3', '2', '4', '0'], bonus_cards)
      expect(success).toBe(true)
      expect(bonus_cards.wild_user().id).toStrictEqual(discord_user.id)
      const word = player.assigned_word.split("")
      expect(player.final_guess).toStrictEqual([word[0], word[2], word[1], word[3], '*'].join(""))
    }

    bonus_cards.add('a')

    {
      const { success, ...rest } = player.make_final_guess(['1', '2', '3', '4', 'b7'], bonus_cards)
      expect(success).toBe(true)
      expect(bonus_cards.wild_user()).toBe(null)
      expect(bonus_cards.users()[0].id).toStrictEqual(discord_user.id)
      expect(rest.wild_used).toBe(false)
      expect(rest.bonus_cards_used).toStrictEqual(['a'])

      const word = player.assigned_word
      expect(player.final_guess).toStrictEqual([word[0], word[1], word[2], word[3], bonus_cards.get(0).card].join(""))
    }
  })

  test("Player Guess Letter", () => {
    const discord_user = new DiscordUserMock()
    const length_of_words = 5
    const player = new Player({ discord_user, length_of_words })
    let deck = new Deck()

    {
      const { success, ...rest } = player.set_word_from_deck(deck, 'kayak')
      expect(success).toBe(true)
      expect(rest.deck.size()).toBe(59)
    }

    {
      player.assign_word('hello', 1)
      expect(player.num).toBe(1)
      expect(player.assigned_word.split("").sort().join("")).toBe('hello'.split("").sort().join(""))
      expect(player.assigned_word_unshuffled).toBe('hello')
    }

    player.receive_hint('H?NT')
    player.advance_to_next_letter(deck, 'I')
    player.round_complete()

    player.receive_hint('CH?CK')
    player.advance_to_next_letter(deck, 'E')
    player.round_complete()

    player.receive_hint('TE?T')
    player.advance_to_next_letter(deck, 'S')
    player.round_complete()

    player.receive_hint('DRI?K')
    player.advance_to_next_letter(deck, 'N')
    player.round_complete()

    player.receive_hint('FINA?')
    player.advance_to_next_letter(deck, 'L')
    player.round_complete()

    expect(player.on_bonus_letter).toBe(true)
    player.receive_hint('?IERCE')

    {
      const { success, ...rest } = player.pass()
      expect(success).toBe(false)
    }
    {
      const { success, ...rest } = player.advance_to_next_letter(deck, 'P')
      expect(success).toBe(false)
    }
    {
      const prev_bonus_letter = player.bonus_letter
      const { success, ...rest } = player.guess_bonus(deck, 'p')
      expect(success).toBe(true)
      expect(rest.correct).toBe(prev_bonus_letter.toLowerCase() === "p")
    }

    player.round_complete()
    player.receive_hint('RANDO?')

    {
      const { success, ...rest } = player.guess_bonus(deck, player.bonus_letter)
      expect(success).toBe(true)
      expect(rest.correct).toBe(true)
    }

    player.round_complete()
  })
})