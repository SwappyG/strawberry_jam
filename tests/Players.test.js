import { Deck } from "../src/strawberry_jam/Deck.js"
import { BonusCards } from "../src/strawberry_jam/BonusCards.js"
import { PLAYER_STATE } from "../src/strawberry_jam/PlayerState.js"
import { Player } from "../src/strawberry_jam/Player.js"
import { Players } from "../src/strawberry_jam/Players.js"

import { DiscordUserMock } from "./DiscordUserMock.js"

describe('Players Tests', () => {
  test("Players Construct", () => {
    const deck = new Deck()
    let players = new Players(4)

    expect(players.num()).toBe(0)
    expect(players.get_player('fake')).toBe(null)
  })

  test("Players Add Remove", () => {
    const deck = new Deck()
    let players = new Players(2)

    expect(players.num()).toBe(0)

    const user_1 = new DiscordUserMock()
    const user_2 = new DiscordUserMock()
    const user_3 = new DiscordUserMock()
    {
      const { success, ...rest } = players.add_player({ discord_user: user_1, length_of_words: 5 })
      expect(success).toBe(true)
      expect(players.num()).toBe(1)
    }
    {
      const { success, ...rest } = players.add_player({ discord_user: user_1, length_of_words: 5 })
      expect(success).toBe(false)
      expect(players.num()).toBe(1)
    }
    {
      const { success, ...rest } = players.add_player({ discord_user: user_2, length_of_words: 5 })
      expect(success).toBe(true)
      expect(players.num()).toBe(2)
    }
    {
      const { success, ...rest } = players.add_player({ discord_user: user_3, length_of_words: 5 })
      expect(success).toBe(false)
      expect(players.num()).toBe(2)
    }

    expect(players.get_player(user_1.id)).not.toBe(null)
    expect(players.get_player(user_2.id)).not.toBe(null)
    expect(players.get_player(user_3.id)).toBe(null)

    {
      const { success, ...rest } = players.remove_player(user_3)
      expect(success).toBe(false)
      expect(players.num()).toBe(2)
    }
    {
      const { success, ...rest } = players.remove_player(user_1)
      expect(success).toBe(true)
      expect(players.num()).toBe(1)
      expect(players.get_player(user_1.id)).toBe(null)
    }
    {
      const { success, ...rest } = players.remove_player(user_2)
      expect(success).toBe(true)
      expect(players.num()).toBe(0)
      expect(players.get_player(user_2.id)).toBe(null)
    }
  })

  test("Players Assign Words", () => {
    const deck = new Deck()
    let players = new Players(2)

    expect(players.num()).toBe(0)

    const user_1 = new DiscordUserMock()
    const user_2 = new DiscordUserMock()
    const user_3 = new DiscordUserMock()
    {
      const { success, ...rest } = players.add_player({ discord_user: user_1, length_of_words: 5 })
      expect(success).toBe(true)
    }
    {
      const { success, ...rest } = players.assign_word_to_all_players(user_1, {})
      expect(success).toBe(false) // can't start with only 1 player
    }

    {
      const { success, ...rest } = players.add_player({ discord_user: user_2, length_of_words: 5 })
      expect(success).toBe(true)
    }
    {
      const { success, ...rest } = players.assign_word_to_all_players(user_3, {})
      expect(success).toBe(false) // player not in players can't assign
    }
    {
      const { success, ...rest } = players.assign_word_to_all_players(user_2, {})
      expect(success).toBe(false) // players haven't set their word yet
    }

    {
      const { success, ...rest } = players.get_player(user_1.id).set_word_from_deck(deck, 'hello')
      expect(success).toBe(true)
    }
    {
      const { success, ...rest } = players.get_player(user_2.id).set_word_from_deck(deck, 'kayak')
      expect(success).toBe(true)
    }
    {
      const { success, ...rest } = players.assign_word_to_all_players(user_2, {})
      expect(success).toBe(true)
    }

    expect(players.get_player(user_1.id).num).toBe(1)
    expect(players.get_player(user_2.id).num).toBe(2)

    expect(players.get_player(user_1.id).assigned_word_unshuffled).toBe('kayak')
    expect(players.get_player(user_2.id).assigned_word_unshuffled).toBe('hello')
  })

  test("Players Required Clues", () => {
    const deck = new Deck()
    let players = new Players(2)

    const user_1 = new DiscordUserMock()
    const user_2 = new DiscordUserMock()
    const user_3 = new DiscordUserMock()

    players.add_player({ discord_user: user_1, length_of_words: 5 })
    players.add_player({ discord_user: user_2, length_of_words: 5 })
    expect(players.num()).toBe(2)

    players.get_player(user_1.id).set_word_from_deck(deck, 'hello')
    players.get_player(user_2.id).set_word_from_deck(deck, 'kayak')
    players.assign_word_to_all_players(user_2, {})

    expect(players.get_player(user_1.id).is_ready()).toBe(true)
    expect(players.get_player(user_2.id).is_ready()).toBe(true)

    const play_round = (hint_giver, hint_taker) => {
      players.get_player(hint_giver.id).give_hint()
      players.get_player(hint_taker.id).pass()
      players.end_round()
    }

    expect(players.all_players_met_required_clues()).toBe(false)

    play_round(user_1, user_2)
    expect(players.all_players_met_required_clues()).toBe(false)
    play_round(user_1, user_2)
    expect(players.all_players_met_required_clues()).toBe(false)
    play_round(user_1, user_2)
    expect(players.all_players_met_required_clues()).toBe(false)

    play_round(user_2, user_1)
    expect(players.all_players_met_required_clues()).toBe(false)
    play_round(user_2, user_1)
    expect(players.all_players_met_required_clues()).toBe(false)
    play_round(user_2, user_1)
    expect(players.all_players_met_required_clues()).toBe(true) // 3 hints given by each player
  })

  test("Players Add Votes", () => {
    const deck = new Deck()
    let players = new Players(2)

    const user_1 = new DiscordUserMock()
    const user_2 = new DiscordUserMock()
    const user_3 = new DiscordUserMock()

    players.add_player({ discord_user: user_1, length_of_words: 5 })
    players.add_player({ discord_user: user_2, length_of_words: 5 })
    expect(players.num()).toBe(2)

    players.get_player(user_1.id).set_word_from_deck(deck, 'hello')
    players.get_player(user_2.id).set_word_from_deck(deck, 'kayak')
    players.assign_word_to_all_players(user_2, {})

    {
      const { success, ...rest } = players.add_votes(user_1.id, '0')
      expect(success).toBe(false) // invalid index, player nums go from 1 - num players
    }
    {
      const { success, ...rest } = players.add_votes(user_1.id, '3')
      expect(success).toBe(false) // invalid index, player nums go from 1 - num players
    }
    {
      const { success, ...rest } = players.add_votes(user_1.id, '1,1')
      expect(success).toBe(false) // duplicate index
    }
    {
      const { success, ...rest } = players.add_votes(user_1.id, 'a')
      expect(success).toBe(false) // invalid index
    }
    {
      const { success, ...rest } = players.add_votes(user_1.id, '1')
      expect(success).toBe(true)
    }
  })

  test("Players All Have Final Guess", () => {
    const deck = new Deck()
    let players = new Players(2)

    const user_1 = new DiscordUserMock()
    const user_2 = new DiscordUserMock()
    const user_3 = new DiscordUserMock()

    players.add_player({ discord_user: user_1, length_of_words: 5 })
    players.add_player({ discord_user: user_2, length_of_words: 5 })
    expect(players.num()).toBe(2)

    players.get_player(user_1.id).set_word_from_deck(deck, 'hello')
    players.get_player(user_2.id).set_word_from_deck(deck, 'kayak')
    players.assign_word_to_all_players(user_2, {})

    expect(players.all_players_have_final_guess()).toBe(false)

    const bonus_cards = new BonusCards()
    {
      const { success, ...rest } = players.get_player(user_1.id).make_final_guess('2,3,1,4,5', bonus_cards)
      expect(success).toBe(true)
      expect(players.all_players_have_final_guess()).toBe(false) // only 1 player does
    }
    {
      const { success, ...rest } = players.get_player(user_2.id).make_final_guess('2,3,1,4,5', bonus_cards)
      expect(success).toBe(true)
      expect(players.all_players_have_final_guess()).toBe(true)
    }
  })

  test("Players All Responded To Hint", () => {
    const deck = new Deck()
    let players = new Players(2)

    const user_1 = new DiscordUserMock()
    const user_2 = new DiscordUserMock()
    const user_3 = new DiscordUserMock()

    players.add_player({ discord_user: user_1, length_of_words: 5 })
    players.add_player({ discord_user: user_2, length_of_words: 5 })
    expect(players.num()).toBe(2)

    players.get_player(user_1.id).set_word_from_deck(deck, 'hello')
    players.get_player(user_2.id).set_word_from_deck(deck, 'kayak')
    players.assign_word_to_all_players(user_2, {})

    expect(players.all_players_done_responded_to_hint()).toBe(true)
    players.get_player(user_1.id).give_hint()
    players.get_player(user_2.id).receive_hint('H?INTS')
    expect(players.all_players_done_responded_to_hint()).toBe(false)
    players.get_player(user_2.id).pass()
    expect(players.all_players_done_responded_to_hint()).toBe(true)
  })
})