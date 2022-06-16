import { Deck } from "../src/strawberry_jam/Deck.js"
import { StrawberryJam } from "../src/strawberry_jam/StrawberryJam.js"

import { DiscordUserMock } from "./DiscordUserMock.js"

describe('StrawberryJam Tests', () => {
  // test("StrawberryJam Construct", () => {
  //   const deck = new Deck()
  //   {
  //     const { success, ...rest } = StrawberryJam.create({ game_id: 'ABCD', args: {}, prefix: '?' })
  //     expect(success).toBe(false) // missing --w arg
  //   }
  //   {
  //     const { success, ...rest } = StrawberryJam.create({ game_id: 'ABCD', args: { letters: 5 }, prefix: '?' })
  //     expect(success).toBe(true)
  //     expect(rest.game).not.toBe(null)
  //   }
  // })

  test("StrawberryJam Join Exit", async () => {
    const sjam = StrawberryJam.create({ game_id: 'ABCD', args: { letters: 5, max_players: 3 }, prefix: '?' }).game

    const user_1 = new DiscordUserMock()
    const user_2 = new DiscordUserMock()
    const user_3 = new DiscordUserMock()
    const user_4 = new DiscordUserMock()
    {
      const { success } = await sjam.join(user_1)
      expect(success).toBe(true)
    }
    {
      const { success } = await sjam.join(user_1)
      expect(success).toBe(false) // can't join twice
    }
    {
      const { success } = await sjam.join(user_2)
      expect(success).toBe(true)
    }
    {
      const { success } = await sjam.join(user_3)
      expect(success).toBe(true) // game full
    }
    {
      const { success } = await sjam.join(user_4)
      expect(success).toBe(false) // game full
    }

    {
      const { success } = await sjam.exit(user_4)
      expect(success).toBe(false) // never in the game
    }
    {
      const { success } = await sjam.exit(user_1)
      expect(success).toBe(true)
    }
    {
      const { success } = await sjam.exit(user_1)
      expect(success).toBe(false) // already exited
    }

    await sjam._set_word({ discord_user: user_2, args: { _: ["w", "hello"], is_dm: true } })
    await sjam._set_word({ discord_user: user_3, args: { _: ["w", "kayak"], is_dm: true } })
    await sjam._start_game({ discord_user: user_2, args: { _: ["s"], is_dm: true } })

    {
      const { success } = await sjam.join(user_1)
      expect(success).toBe(false) // game already started
    }
    {
      const { success } = await sjam.exit(user_2)
      expect(success).toBe(false) // game already started
    }
    {
      const { success } = await sjam.exit(user_3)
      expect(success).toBe(false) // game already started
    }
  })

  test("StrawberryJam Set Word", async () => {
    const sjam = StrawberryJam.create({ game_id: 'ABCD', args: { letters: 5, max_players: 2 }, prefix: '?' }).game

    const user_1 = new DiscordUserMock()
    const user_2 = new DiscordUserMock()
    const user_3 = new DiscordUserMock()
    await sjam.join(user_1)
    await sjam.join(user_2)

    const cmds = sjam.get_commands()
    {
      const { success, ...rest } = await cmds["w"]({ discord_user: user_1, args: { _: ["w"] } })
      expect(success).toBe(false) // missing word 
    }
    {
      const { success, ...rest } = await cmds["w"]({ discord_user: user_1, args: { _: ["w", "mini"] } })
      expect(success).toBe(false) // word too short
    }
    {
      const { success, ...rest } = await cmds["w"]({ discord_user: user_1, args: { _: ["w", "extended"] } })
      expect(success).toBe(false) // word too long
    }
    {
      const { success, ...rest } = await cmds["w"]({ discord_user: user_1, args: { _: ["w", "kazoo"] } })
      expect(success).toBe(false) // invalid chars
    }
    {
      const { success, ...rest } = await cmds["w"]({ discord_user: user_1, args: { _: ["w", "wer24"] } })
      expect(success).toBe(false) // invalid chars
    }
    {
      const { success, ...rest } = await cmds["w"]({ discord_user: user_1, args: { _: ["w", 12343] } })
      expect(success).toBe(false) // invalid chars
    }
    {
      const { success, ...rest } = await cmds["w"]({ discord_user: user_1, args: { _: ["w", "hello"] } })
      expect(success).toBe(false) // must be dm
    }
    {
      const { success, ...rest } = await cmds["w"]({ discord_user: user_3, args: { _: ["w", "hello"], is_dm: true } })
      expect(success).toBe(false) // not in game
    }
    {
      const { success, ...rest } = await cmds["w"]({ discord_user: user_1, args: { _: ["w", "hello"], is_dm: true } })
      expect(success).toBe(true)
    }
    {
      const { success, ...rest } = await cmds["w"]({ discord_user: user_1, args: { _: ["w", "diffs"], is_dm: true } })
      expect(success).toBe(true) // changing words is fine
    }
    {
      const { success, ...rest } = await cmds["w"]({ discord_user: user_2, args: { _: ["w", "kayak"], is_dm: true } })
      expect(success).toBe(true)
    }

    await sjam._start_game({ discord_user: user_2, args: { _: ["s"], is_dm: true } })
    {
      const { success, ...rest } = await cmds["w"]({ discord_user: user_1, args: { _: ["w", "worse"], is_dm: true } })
      expect(success).toBe(false) // not changing after start
    }
  })

  test("StrawberryJam Start End", async () => {
    const sjam = StrawberryJam.create({ game_id: 'ABCD', args: { letters: 5, max_players: 2 }, prefix: '?' }).game

    const user_1 = new DiscordUserMock()
    const user_2 = new DiscordUserMock()
    const user_3 = new DiscordUserMock()
    await sjam.join(user_1)
    await sjam.join(user_2)

    const cmds = sjam.get_commands()
    {
      const { success, ...rest } = await cmds["e"]({ discord_user: user_1, args: { _: ["e"] } })
      expect(success).toBe(true) // end game always works 
    }
    await sjam.join(user_1)
    await sjam.join(user_2)

    {
      const { success, ...rest } = await cmds["s"]({ discord_user: user_1, args: { _: ["s"] } })
      expect(success).toBe(false) // players need to set word first 
    }

    await cmds["w"]({ discord_user: user_1, args: { _: ["w", "hello"], is_dm: true } })
    {
      const { success, ...rest } = await cmds["s"]({ discord_user: user_1, args: { _: ["s"] } })
      expect(success).toBe(false) // players need to set word first 
    }

    await cmds["w"]({ discord_user: user_2, args: { _: ["w", "kayak"], is_dm: true } })
    {
      const { success, ...rest } = await cmds["s"]({ discord_user: user_3, args: { _: ["s"] } })
      expect(success).toBe(false) // user not in game
    }
    {
      const { success, ...rest } = await cmds["s"]({ discord_user: user_1, args: { _: ["s"] } })
      expect(success).toBe(true)
    }

    {
      const { success, ...rest } = await cmds["s"]({ discord_user: user_1, args: { _: ["s"] } })
      expect(success).toBe(false) // already started 
    }

    {
      const { success, ...rest } = await cmds["e"]({ discord_user: user_1, args: { _: ["e"] } })
      expect(success).toBe(true) // end game always works 
    }
  })

  test("StrawberryJam Give Clue Args Check", async () => {
    const sjam = StrawberryJam.create({ game_id: 'ABCD', args: { letters: 5, max_players: 2 }, prefix: '?' }).game
    const cmds = sjam.get_commands()

    const user_1 = new DiscordUserMock()
    const user_2 = new DiscordUserMock()
    const user_3 = new DiscordUserMock()

    {
      const { success, ...rest } = await cmds["c"]({ discord_user: user_1, args: { _: ["c"] } })
      expect(success).toBe(false) // game hasn't started // user not in game 
    }

    await sjam.join(user_1)
    await sjam.join(user_2)

    {
      const { success, ...rest } = await cmds["c"]({ discord_user: user_1, args: { _: ["c"] } })
      expect(success).toBe(false) // game hasn't started
    }

    await cmds["w"]({ discord_user: user_1, args: { _: ["w", "hello"], is_dm: true } })
    await cmds["w"]({ discord_user: user_2, args: { _: ["w", "kayak"], is_dm: true } })

    {
      const { success, ...rest } = await cmds["c"]({ discord_user: user_1, args: { _: ["c"] } })
      expect(success).toBe(false) // game hasn't started 
    }

    await cmds["s"]({ discord_user: user_1, args: { _: ["s"] } })

    {
      const { success, ...rest } = await cmds["c"]({ discord_user: user_3, args: { _: ["c"] } })
      expect(success).toBe(false) // user not in game 
    }
    {
      const { success, ...rest } = await cmds["c"]({ discord_user: user_1, args: { _: ["c"] } })
      expect(success).toBe(false) // hint indices are missing
    }
    {
      const { success, ...rest } = await cmds["c"]({ discord_user: user_1, args: { _: ["c", "1,3,4,4,7"] } })
      expect(success).toBe(false) // index out of bounds // includes own player
    }
    {
      const { success, ...rest } = await cmds["c"]({ discord_user: user_1, args: { _: ["c", "1,3,4,4"] } })
      expect(success).toBe(false) // includes own player
    }
    {
      const { success, ...rest } = await cmds["c"]({ discord_user: user_1, args: { _: ["c", "1344"] } })
      expect(success).toBe(false) // not comma separated
    }
    {
      const { success, ...rest } = await cmds["c"]({ discord_user: user_1, args: { _: ["c", "d,r,3,4"] } })
      expect(success).toBe(false) // bad indices
    }

    {
      const { success, ...rest } = await cmds["c"]({ discord_user: user_1, args: { _: ["c", "0,2,3,4,5,6,3,4"] } })
      expect(success).toBe(true)
    }

    {
      const { success, ...rest } = await cmds["c"]({ discord_user: user_2, args: { _: ["c", "0,3,4,5,6,3,4"] } })
      expect(success).toBe(false) // two ppl can't give clues at once
    }
    {
      const { success, ...rest } = await cmds["c"]({ discord_user: user_1, args: { _: ["c", "0,3,4,5,6,3,4"] } })
      expect(success).toBe(false) // two ppl can't give clues at once
    }
  })

  test("StrawberryJam Public Pile Unlock", async () => {
    const sjam = StrawberryJam.create({ game_id: 'ABCD', args: { letters: 5, max_players: 2 }, prefix: '?' }).game
    const cmds = sjam.get_commands()

    const user_1 = new DiscordUserMock()
    const user_2 = new DiscordUserMock()
    const user_3 = new DiscordUserMock()

    await sjam.join(user_1)
    await sjam.join(user_2)
    await cmds["w"]({ discord_user: user_1, args: { _: ["w", "hello"], is_dm: true } })
    await cmds["w"]({ discord_user: user_2, args: { _: ["w", "kayak"], is_dm: true } })
    await cmds["s"]({ discord_user: user_1, args: { _: ["s"] } })

    const run_one_round = async (hint) => {
      await cmds["c"]({ discord_user: user_1, args: { _: ["c", hint] } })
    }

    {
      const game_state = sjam.game_state()
      for (let ii = 0; ii < game_state.public_pile_num_cards[0] - 1; ii++) {
        await run_one_round('0,0,0,3') // include public pile 0 (2 players + 1)
      }
    }
    {
      const game_state = sjam.game_state()
      await run_one_round('0,0,0,3')
      expect(sjam.game_state().remaining_clues).toBe(game_state.remaining_clues) // used 1, regained one from public pile
    }
  })

  test("StrawberryJam Give Clue To Final Guess", async () => {
    const sjam = StrawberryJam.create({ game_id: 'ABCD', args: { letters: 5, max_players: 2 }, prefix: '?' }).game
    const cmds = sjam.get_commands()

    const user_1 = new DiscordUserMock()
    const user_2 = new DiscordUserMock()
    const user_3 = new DiscordUserMock()

    await sjam.join(user_1)
    await sjam.join(user_2)
    await cmds["w"]({ discord_user: user_1, args: { _: ["w", "hello"], is_dm: true } })
    await cmds["w"]({ discord_user: user_2, args: { _: ["w", "kayak"], is_dm: true } })
    await cmds["s"]({ discord_user: user_1, args: { _: ["s"] } })

    const run_one_round = async (hint) => {
      await cmds["c"]({ discord_user: user_1, args: { _: ["c", hint] } })
    }

    const game_state = sjam.game_state()
    for (let ii = 0; ii < game_state.remaining_clues; ii++) {
      await run_one_round('2,2,2,2') // avoid unlocking public clues and other player
    }

    {
      const game_state = sjam.game_state()
      const { success, ...rest } = await cmds["c"]({ discord_user: user_1, args: { _: ["c", "0,0,0,0"] } })
      expect(success).toBe(false) // not more clues remaining
    }
  })

  test("StrawberryJam Final Guess", async () => {
    const sjam = StrawberryJam.create({ game_id: 'ABCD', args: { letters: 5, max_players: 3 }, prefix: '?' }).game
    const cmds = sjam.get_commands()

    const user_1 = new DiscordUserMock()
    const user_2 = new DiscordUserMock()
    const user_3 = new DiscordUserMock()

    user_1.username
    user_2.username
    user_3.username
    console.log(await sjam.join(user_1))
    console.log(await sjam.join(user_2))
    console.log(await sjam.join(user_3))
    console.log(await cmds["w"]({ discord_user: user_1, args: { _: ["w", "hello"], is_dm: true } }))
    console.log(await cmds["w"]({ discord_user: user_2, args: { _: ["w", "kayak"], is_dm: true } }))
    console.log(await cmds["w"]({ discord_user: user_3, args: { _: ["w", "cargo"], is_dm: true } }))
    console.log(await cmds["s"]({ discord_user: user_1, args: { _: ["s"] } }))

    const run_one_round = async (hint) => {
      console.log(await cmds["c"]({ discord_user: user_1, args: { _: ["c", hint] } }))
      console.log(await cmds["a"]({ discord_user: user_2, args: { _: ["a", 'a'] } }))
      console.log(await cmds["p"]({ discord_user: user_3, args: { _: ["p"] } }))
    }

    // get to bonus letters
    await run_one_round('0,2,3,4,5,6')
    await run_one_round('0,2,3,4,5,6')
    await run_one_round('0,2,3,4,5,6')
    await run_one_round('0,2,3,4,5,6')
    await run_one_round('0,2,3,4,5,6')

    const generate_bonus_card = async () => {
      const game_state = sjam.game_state()
      console.log(await cmds["c"]({ discord_user: user_1, args: { _: ["c", "0,2,3,4,5,6"] } }))
      console.log(await cmds["g"]({ discord_user: user_2, args: { _: ["g", game_state.player_active_letters[1][0]] } }))
      console.log(await cmds["p"]({ discord_user: user_3, args: { _: ["p"] } }))
    }

    const game_state = sjam.game_state()
    while (sjam.game_state().remaining_clues > 0) {
      await generate_bonus_card()
    }

    {
      const { success, ...rest } = await cmds["f"]({ discord_user: user_1, args: { _: ["f", "1,1,2,3,4"] } })
      expect(success).toBe(false) // duplicate indices
    }
    {
      const { success, ...rest } = await cmds["f"]({ discord_user: user_1, args: { _: ["f", "1,2,3,4"] } })
      expect(success).toBe(false) // too few indices
    }
    {
      const { success, ...rest } = await cmds["f"]({ discord_user: user_1, args: { _: ["f", "0,1,2,3,b7"] } })
      expect(success).toBe(false) // < 0 > [*] must replace player card, not bonus card
    }

    {
      const { success, ...rest } = await cmds["f"]({ discord_user: user_1, args: { _: ["f", "1,2,3,4,7"] } })
      expect(success).toBe(false) // missing 'b' infront of bonus card
    }

    {
      const { success, ...rest } = await cmds["f"]({ discord_user: user_1, args: { _: ["f", "1,2,3,4,b7"] } })
      expect(success).toBe(true)
    }

    {
      const { success, ...rest } = await cmds["f"]({ discord_user: user_2, args: { _: ["f", "1,2,3,4,5,b7"] } })
      expect(success).toBe(false) // p1 is already using b7
    }
    {
      const { success, ...rest } = await cmds["f"]({ discord_user: user_2, args: { _: ["f", "0,1,2,3,4,b8"] } })
      expect(success).toBe(true)
    }

    {
      const { success, ...rest } = await cmds["f"]({ discord_user: user_3, args: { _: ["f", "0,2,3,4,5"] } })
      expect(success).toBe(false) // wild card already in use
    }
  })

  test("StrawberryJam Give Clue Bonus Cards", async () => {
    const sjam = StrawberryJam.create({ game_id: 'ABCD', args: { letters: 5, max_players: 2 }, prefix: '?' }).game
    const cmds = sjam.get_commands()

    const user_1 = new DiscordUserMock()
    const user_2 = new DiscordUserMock()
    const user_3 = new DiscordUserMock()

    await sjam.join(user_1)
    await sjam.join(user_2)
    await cmds["w"]({ discord_user: user_1, args: { _: ["w", "hello"], is_dm: true } })
    await cmds["w"]({ discord_user: user_2, args: { _: ["w", "kayak"], is_dm: true } })
    await cmds["s"]({ discord_user: user_1, args: { _: ["s"] } })

    const run_one_round = async (hint) => {
      console.log(await cmds["c"]({ discord_user: user_1, args: { _: ["c", hint] } }))
      console.log(await cmds["a"]({ discord_user: user_2, args: { _: ["a", "f"] } }))
    }

    // 5 rounds, so someone ends up on bonus letter
    await run_one_round('0,2,3,4,5,6') // unlock public clues
    await run_one_round('0,2,3,4,5,6') // unlock public clues
    await run_one_round('0,2,3,4,5,6') // unlock public clues
    await run_one_round('0,2,3,4,5,6') // unlock public clues
    await run_one_round('0,2,3,4,5,6') // unlock public clues

    const generate_bonus_card = async () => {
      const game_state = sjam.game_state()
      console.log(await cmds["c"]({ discord_user: user_1, args: { _: ["c", "0,2,3,4,5,6"] } }))
      console.log(await cmds["g"]({ discord_user: user_2, args: { _: ["g", game_state.player_active_letters[1][0]] } }))
    }

    await generate_bonus_card()
    {
      const { success, ...rest } = await cmds["c"]({ discord_user: user_1, args: { _: ["c", "0,2,3,4,5,6,7"] } })
      expect(success).toBe(true) // there should be a bonus card for us to use
    }
    {
      const { success, ...rest } = await cmds["c"]({ discord_user: user_1, args: { _: ["c", "0,2,3,4,5,6,7"] } })
      expect(success).toBe(false) // the bonus card should have been consumed
    }

    await generate_bonus_card()
    await generate_bonus_card()
    await generate_bonus_card()
    await generate_bonus_card()
    {
      const { success, ...rest } = await cmds["c"]({ discord_user: user_1, args: { _: ["c", "0,2,3,4,5,6,10,7"] } })
      expect(success).toBe(true) // there should be a bonus card for us to use
    }
  })

  test("StrawberryJam Pass", async () => {
    const sjam = StrawberryJam.create({ game_id: 'ABCD', args: { letters: 5, max_players: 2 }, prefix: '?' }).game
    const cmds = sjam.get_commands()

    const user_1 = new DiscordUserMock()
    const user_2 = new DiscordUserMock()
    const user_3 = new DiscordUserMock()
    {
      const { success, ...rest } = await cmds["p"]({ discord_user: user_1, args: { _: ["p"] } })
      expect(success).toBe(false) // not even in the game
    }

    await sjam.join(user_1)
    await sjam.join(user_2)
    {
      const { success, ...rest } = await cmds["p"]({ discord_user: user_1, args: { _: ["p"] } })
      expect(success).toBe(false) // can't pass when there's no hint
    }

    await cmds["w"]({ discord_user: user_1, args: { _: ["w", "hello"], is_dm: true } })
    await cmds["w"]({ discord_user: user_2, args: { _: ["w", "kayak"], is_dm: true } })
    {
      const { success, ...rest } = await cmds["p"]({ discord_user: user_1, args: { _: ["p"] } })
      expect(success).toBe(false) // can't pass when there's no hint
    }

    await cmds["s"]({ discord_user: user_1, args: { _: ["s"] } })
    {
      const { success, ...rest } = await cmds["p"]({ discord_user: user_2, args: { _: ["p"] } })
      expect(success).toBe(false) // can't pass when there's no hint
    }

    console.log(await cmds["c"]({ discord_user: user_1, args: { _: ["c", '0,2,3,4,5,6'] } }))
    {
      const { success, ...rest } = await cmds["p"]({ discord_user: user_3, args: { _: ["p"] } })
      expect(success).toBe(false) // not in game
    }
    {
      const { success, ...rest } = await cmds["p"]({ discord_user: user_1, args: { _: ["p"] } })
      expect(success).toBe(false) // hint giver can't pass
    }

    {
      const { success, ...rest } = await cmds["p"]({ discord_user: user_2, args: { _: ["p"] } })
      expect(success).toBe(true)
    }
    {
      const { success, ...rest } = await cmds["p"]({ discord_user: user_2, args: { _: ["p"] } })
      expect(success).toBe(false) // already passed
    }
  })

  test("StrawberryJam Advance", async () => {
    const sjam = StrawberryJam.create({ game_id: 'ABCD', args: { letters: 5, max_players: 2 }, prefix: '?' }).game
    const cmds = sjam.get_commands()

    const user_1 = new DiscordUserMock()
    const user_2 = new DiscordUserMock()
    const user_3 = new DiscordUserMock()
    {
      const { success, ...rest } = await cmds["a"]({ discord_user: user_1, args: { _: ["a", "f"] } })
      expect(success).toBe(false) // not even in the game
    }

    await sjam.join(user_1)
    await sjam.join(user_2)
    {
      const { success, ...rest } = await cmds["a"]({ discord_user: user_1, args: { _: ["a", "f"] } })
      expect(success).toBe(false) // not even in the game
    }

    await cmds["w"]({ discord_user: user_1, args: { _: ["w", "hello"], is_dm: true } })
    await cmds["w"]({ discord_user: user_2, args: { _: ["w", "kayak"], is_dm: true } })
    {
      const { success, ...rest } = await cmds["a"]({ discord_user: user_1, args: { _: ["a", "f"] } })
      expect(success).toBe(false) // not even in the game
    }

    await cmds["s"]({ discord_user: user_1, args: { _: ["s"] } })
    {
      const { success, ...rest } = await cmds["a"]({ discord_user: user_1, args: { _: ["a", "f"] } })
      expect(success).toBe(false) // no hint in progress
    }

    console.log(await cmds["c"]({ discord_user: user_1, args: { _: ["c", '0,2,3,4,5,6'] } }))
    {
      const { success, ...rest } = await cmds["a"]({ discord_user: user_3, args: { _: ["a", "f"] } })
      expect(success).toBe(false) // user not in game
    }
    {
      const { success, ...rest } = await cmds["a"]({ discord_user: user_1, args: { _: ["a", "f"] } })
      expect(success).toBe(false) // hint giver can't advance
    }
    {
      const { success, ...rest } = await cmds["a"]({ discord_user: user_1, args: { _: ["a"] } })
      expect(success).toBe(false) // missing guess character
    }

    {
      const { success, ...rest } = await cmds["a"]({ discord_user: user_2, args: { _: ["a", "f"] } })
      expect(success).toBe(true)
    }
    {
      const { success, ...rest } = await cmds["a"]({ discord_user: user_2, args: { _: ["a", "f"] } })
      expect(success).toBe(false) // already responded to hint
    }
  })

  test("StrawberryJam Vote", async () => {
    const sjam = StrawberryJam.create({ game_id: 'ABCD', args: { letters: 5, max_players: 2 }, prefix: '?' }).game
    const cmds = sjam.get_commands()

    const user_1 = new DiscordUserMock()
    const user_2 = new DiscordUserMock()
    const user_3 = new DiscordUserMock()

    console.log(await sjam.join(user_1))
    console.log(await sjam.join(user_2))

    {
      const { success, ...rest } = await cmds["V"]({ discord_user: user_1, args: { _: ["V", "1,2"] } })
      expect(success).toBe(false) // can't vote till results
    }

    console.log(await cmds["w"]({ discord_user: user_1, args: { _: ["w", "hello"], is_dm: true } }))
    console.log(await cmds["w"]({ discord_user: user_2, args: { _: ["w", "kayak"], is_dm: true } }))
    console.log(await cmds["w"]({ discord_user: user_3, args: { _: ["w", "cargo"], is_dm: true } }))

    {
      const { success, ...rest } = await cmds["V"]({ discord_user: user_1, args: { _: ["V", "1,2"] } })
      expect(success).toBe(false) // can't vote till results
    }

    console.log(await cmds["s"]({ discord_user: user_1, args: { _: ["s"] } }))

    {
      const { success, ...rest } = await cmds["V"]({ discord_user: user_1, args: { _: ["V", "1,2"] } })
      expect(success).toBe(false) // can't vote till results
    }

    // move to final guess state
    let game_state = sjam.game_state()
    while (game_state.remaining_clues > 0) {
      console.log(game_state)
      console.log(await cmds["c"]({ discord_user: user_1, args: { _: ["c", '0,2,3,4,5,6'] } }))
      console.log(await cmds["a"]({ discord_user: user_2, args: { _: ["a", "a"] } }))
      console.log(await cmds["g"]({ discord_user: user_2, args: { _: ["g", game_state.player_active_letters[1][0]] } }))
      game_state = sjam.game_state()
    }

    {
      const { success, ...rest } = await cmds["V"]({ discord_user: user_1, args: { _: ["V", "1,2"] } })
      expect(success).toBe(false) // can't vote till results
    }

    console.log(await cmds["f"]({ discord_user: user_1, args: { _: ["f", "3,2,4,1,5"] } }))
    console.log(await cmds["f"]({ discord_user: user_2, args: { _: ["f", "3,2,4,1,5"] } }))

    {
      const { success, ...rest } = await cmds["V"]({ discord_user: user_1, args: { _: ["V", "1,2,3"] } })
      expect(success).toBe(false) // index out of bounds
    }
    {
      const { success, ...rest } = await cmds["V"]({ discord_user: user_3, args: { _: ["V", "1,2"] } })
      expect(success).toBe(false) // user not in game
    }
    {
      const { success, ...rest } = await cmds["V"]({ discord_user: user_1, args: { _: ["V", "a,b,32"] } })
      expect(success).toBe(false) // bad indices
    }
    {
      const { success, ...rest } = await cmds["V"]({ discord_user: user_1, args: { _: ["V", "0,1"] } })
      expect(success).toBe(false) // index out of bounds
    }

    {
      const { success, ...rest } = await cmds["V"]({ discord_user: user_1, args: { _: ["V", "1,2"] } })
      expect(success).toBe(true)
      const game_state = sjam.game_state()
      expect(game_state.player_votes[0]).toStrictEqual([1, 2])
      expect(game_state.player_votes[1]).toStrictEqual(null)
    }
    {
      const { success, ...rest } = await cmds["V"]({ discord_user: user_2, args: { _: ["V", "1"] } })
      expect(success).toBe(true)
      const game_state = sjam.game_state()
      expect(game_state.player_votes[0]).toStrictEqual([1, 2])
      expect(game_state.player_votes[1]).toStrictEqual([1])
    }
  })
})