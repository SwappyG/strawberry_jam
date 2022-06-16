import { Arg } from "../src/utils/Arg.js"
import { Command } from "../src/utils/Command.js"
import { Commands } from "../src/utils/Commands.js"
import { cyan_block, code_block } from "../src/utils/DiscordFormat.js"
import { make_ret } from "../src/utils/Return.js"
import { is_alphanumeric } from "../src/utils/String.js"

class FuncMock {
  constructor() {
    this._a = 0
    this._b = 0
    this._c = 0
    this._d = 0
  }

  a = () => { this._a++; return make_ret(true, 'got command a') }
  b = () => { this._b++; return make_ret(true, 'got command b') }
  c = () => { this._c++; return make_ret(true, 'got command c') }
  d = () => { this._d++; return make_ret(true, 'got command d') }
  help = () => { return `${cyan_block('Suggested Commands')}\n${code_block('This is some custom help string')}` }
}

describe('Commands Tests', () => {
  test("Commands Call Test", () => {
    let fs = new FuncMock()

    const cmd = new Command({
      name: 'alpha',
      alias: 'a',
      func: fs.a,
      pos_args: [
        new Arg({ name: 'pos1', type: 'string' }),
        new Arg({ name: 'pos2', type: 'enum', choices: [1, 2, 3, 4] })
      ],
      args: [
        new Arg({ name: 'req1', alias: 'r', type: 'string', validator: (v) => make_ret(v.length === 4, `req1 must be less 4 char string`) }),
        new Arg({ name: 'opt1', alias: 'o', type: 'string', default_value: 'default' }),
      ]
    })

    const cmds = new Commands()
    cmds.add(cmd)

    {
      const { success, ...rest } = cmds.call({ cmd_line_args: { "_": ['badcmd'] } })
      expect(success).toBe(false)
    }
    {
      const { success, ...rest } = cmds.call({ cmd_line_args: { "_": ['a', 'anything', 3], 'req1': 'ABCD', 'o': 'whatever' } })
      expect(success).toBe(true)
    }
  })

  test("Commands Help Test", () => {
    const arg_max_players = new Arg({ name: 'max_players', alias: 'n', type: 'number', default_value: 6, help: 'Limits the number of players. A number between 2 and 6, inclusive. Defaults to 6' })
    const arg_game_id = new Arg({ name: 'game_id', alias: 'id', type: 'string', default_value: null, help: 'Sets the new game ID to specified value, instead of randomly generating one' })
    const arg_letters = new Arg({ name: 'letters', alias: 'l', type: 'string', help: 'The number of letters each player will have. A number between 4 and 7, inclusive.' })
    const arg_allow_single_player = new Arg({ name: 'allow_single_player', alias: 'asl', type: 'boolean', default_value: false, help: 'Allows for a game to start with only 1 player (for testing only)' })
    const arg_password = new Arg({ name: 'password', alias: 'p', type: 'string', default_value: null, help: 'Password to protect game. All players must provide this when joining. Default to no password' })
    const arg_unnecessary = new Arg({ name: 'unnecessary', type: 'string', help: 'Useless positional arg for testing purposes' })

    const cmd_new_game = new Command({
      name: 'new_game',
      alias: 'N',
      func: (args) => { make_ret(true) },
      help: 'Create a new game in lobby',
      pos_args: [arg_unnecessary],
      args: [arg_letters, arg_max_players, arg_game_id, arg_allow_single_player, arg_password],
    })

    const cmds = new Commands()
    cmds.add(cmd_new_game)

    {
      const { success, ...rest } = cmds.call({ cmd_line_args: { "_": ['help'] } })
      expect(success).toBe(true)
      console.log(rest)
    }

    {
      const { success, ...rest } = cmds.call({ cmd_line_args: { "_": ['N'], 'h': true } })
      expect(success).toBe(true)
      console.log(rest)
    }
  })
})