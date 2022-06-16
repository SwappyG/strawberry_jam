import { FormatOutput } from "../src/strawberry_jam/FormatOutput.js"
import { make_strawberry_jam, StrawberryJam } from "../src/strawberry_jam/StrawberryJam.js"
import { DiscordUserMock } from "./DiscordUserMock.js"

describe('FormatOutput Tests', () => {
  test("FormatBoard Invalid Before Start", async () => {
    const sjam = StrawberryJam.create({ game_id: 'ABCD', args: { letters: 5 }, prefix: '?' }).game

    const cmds = sjam.get_commands()
    const user_1 = new DiscordUserMock()
    const user_2 = new DiscordUserMock()
    const user_3 = new DiscordUserMock()

    {
      const { success, ...rest } = await cmds['b']({ discord_user: user_1, args: { _: ["b"], is_dm: true } })
      expect(success).toBe(false) // game hasn't started
    }

    console.log(await sjam.join(user_1))
    console.log(await sjam.join(user_2))
    console.log(await sjam.join(user_3))

    {
      const { success, ...rest } = await cmds['b']({ discord_user: user_1, args: { _: ["b"], is_dm: true } })
      expect(success).toBe(false) // game hasn't started
    }

    console.log(await cmds["w"]({ discord_user: user_1, args: { _: ["w", "hello"], is_dm: true } }))
    console.log(await cmds["w"]({ discord_user: user_2, args: { _: ["w", "kayak"], is_dm: true } }))
    console.log(await cmds["w"]({ discord_user: user_3, args: { _: ["w", "cargo"], is_dm: true } }))

    {
      const { success, ...rest } = await cmds['b']({ discord_user: user_1, args: { _: ["b"], is_dm: true } })
      expect(success).toBe(false) // game hasn't started
    }

    console.log(await cmds["s"]({ discord_user: user_1, args: { _: ["s"] } }))

    {
      const { success, ...rest } = await cmds['b']({ discord_user: user_1, args: { _: ["b"], is_dm: true } })
      console.log(rest)
      expect(success).toBe(true)
    }
  })

  test("FormatBoard Valid After State", async () => {
    const sjam = StrawberryJam.create({ game_id: 'ABCD', args: { letters: 5, max_players: 2 }, prefix: '?' }).game

    const cmds = sjam.get_commands()
    const user_1 = new DiscordUserMock()
    const user_2 = new DiscordUserMock()
    const user_3 = new DiscordUserMock()
    console.log(await sjam.join(user_1))
    console.log(await sjam.join(user_2))

    console.log(await cmds["w"]({ discord_user: user_1, args: { _: ["w", "hello"], is_dm: true } }))
    console.log(await cmds["w"]({ discord_user: user_2, args: { _: ["w", "kayak"], is_dm: true } }))
    console.log(await cmds["s"]({ discord_user: user_1, args: { _: ["s"] } }))

    console.log(await cmds["c"]({ discord_user: user_1, args: { _: ["c", '2,3,4,5,6'] } }))
    {
      const { success, ...rest } = await cmds['b']({ discord_user: user_1, args: { _: ["b"], is_dm: true } })
      expect(success).toBe(true) // valid while hint is in progress
    }
    {
      const { success, ...rest } = await cmds['b']({ discord_user: user_3, args: { _: ["b"], is_dm: true } })
      expect(success).toBe(true) // valid by someone not in game
      console.log(user_3.last_msg)
    }

    console.log(await cmds["p"]({ discord_user: user_2, args: { _: ["p"] } }))
    {
      const { success, ...rest } = await cmds['b']({ discord_user: user_1, args: { _: ["b"], is_dm: true } })
      expect(success).toBe(true) // valid when no hint in progress
    }

    let game_state = sjam.game_state()
    while (game_state.remaining_clues > 0) {
      console.log(game_state)
      console.log(await cmds["c"]({ discord_user: user_1, args: { _: ["c", '0,2,3,4,5,6'] } }))
      console.log(await cmds["a"]({ discord_user: user_2, args: { _: ["a", "a"] } }))
      console.log(await cmds["g"]({ discord_user: user_2, args: { _: ["g", game_state.player_active_letters[1][0]] } }))
      game_state = sjam.game_state()
    }

    {
      console.log(sjam.game_state())
      const { success, ...rest } = await cmds['b']({ discord_user: user_1, args: { _: ["b"], is_dm: true } })
      expect(success).toBe(true)
      console.log(user_1.last_msg)
    }

    console.log(await cmds["f"]({ discord_user: user_1, args: { _: ["f", "3,2,4,1,5"] } }))
    console.log(await cmds["f"]({ discord_user: user_2, args: { _: ["f", "3,2,4,1,5"] } }))

    {
      console.log(sjam.game_state())
      const { success, ...rest } = await cmds['b']({ discord_user: user_1, args: { _: ["b"], is_dm: true } })
      expect(success).toBe(true)
      console.log(user_1.last_msg)
    }
  })

  test("FormatBoard Valid After State", async () => {
    const sjam = StrawberryJam.create({ game_id: 'ABCD', args: { letters: 5, max_players: 2 }, prefix: '?' }).game

    const cmds = sjam.get_commands()
    const user_1 = new DiscordUserMock()
    const user_2 = new DiscordUserMock()
    const user_3 = new DiscordUserMock()

    {
      const { success, ...rest } = await cmds['r']({ discord_user: user_1, args: { _: ["r"] } })
      expect(success).toBe(false) // invalid before end of game
    }

    console.log(await sjam.join(user_1))
    console.log(await sjam.join(user_2))
    {
      const { success, ...rest } = await cmds['r']({ discord_user: user_1, args: { _: ["r"] } })
      expect(success).toBe(false) // invalid before end of game
    }

    console.log(await cmds["w"]({ discord_user: user_1, args: { _: ["w", "hello"], is_dm: true } }))
    console.log(await cmds["w"]({ discord_user: user_2, args: { _: ["w", "kayak"], is_dm: true } }))
    {
      const { success, ...rest } = await cmds['r']({ discord_user: user_1, args: { _: ["r"] } })
      expect(success).toBe(false) // invalid before end of game
    }

    console.log(await cmds["s"]({ discord_user: user_1, args: { _: ["s"] } }))
    {
      const { success, ...rest } = await cmds['r']({ discord_user: user_1, args: { _: ["r"] } })
      expect(success).toBe(false) // invalid before end of game
    }

    console.log(await cmds["c"]({ discord_user: user_1, args: { _: ["c", '2,3,4,5,6'] } }))
    {
      const { success, ...rest } = await cmds['r']({ discord_user: user_1, args: { _: ["r"] } })
      expect(success).toBe(false) // invalid before end of game
    }

    console.log(await cmds["p"]({ discord_user: user_2, args: { _: ["p"] } }))
    {
      const { success, ...rest } = await cmds['r']({ discord_user: user_1, args: { _: ["r"] } })
      expect(success).toBe(false) // invalid before end of game
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
      const { success, ...rest } = await cmds['r']({ discord_user: user_1, args: { _: ["r"] } })
      expect(success).toBe(false) // invalid before end of game
    }

    console.log(await cmds["f"]({ discord_user: user_1, args: { _: ["f", "3,2,4,1,5"] } }))
    console.log(await cmds["f"]({ discord_user: user_2, args: { _: ["f", "3,2,4,1,5"] } }))
    {
      console.log(sjam.game_state())
      const { success, ...rest } = await cmds['r']({ discord_user: user_1, args: { _: ["r"] } })
      expect(success).toBe(true)
      console.log(user_1.last_msg)
    }

    {
      const { success, ...rest } = await cmds['r']({ discord_user: user_3, args: { _: ["r"] } })
      expect(success).toBe(true) // valid by players not in game too
      console.log(user_3.last_msg)
    }
  })
})