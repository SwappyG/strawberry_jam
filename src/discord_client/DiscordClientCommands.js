import { is_alphanumeric } from "../utils/String.js"
import { Arg } from "../utils/Arg.js"
import { Command } from "../utils/Command.js"
import { make_ret } from "../utils/Return.js"



export const make_new_game_command = (func, { pos_args, args }) => {
  const r = new Command({
    name: 'new_game',
    alias: 'N',
    help: 'Creates a new game',
    func: func,
    pos_args: pos_args ?? [],
    args: [
      ...(args ?? []),
      new Arg({ name: 'is_dm', type: 'boolean', hidden: true, help: 'Whether msg was a DM or not' }),
      new Arg({ name: 'password', alias: 'p', type: 'string', nullable: true, default_value: null, validator: (text) => is_alphanumeric(text), help: 'Sets a password for the game. Anyone that wants to join the game will have to provide this.' }),
    ],
  })
  return r
}

export const make_kill_game_command = (func) => {
  return new Command({
    name: 'kill_game',
    alias: 'K',
    help: 'Destroys specified game. Can only be done by creator',
    func: func,
    pos_args: [
      new Arg({ name: 'game_id', type: 'string', help: 'ID of game to destroy.' }),
    ],
    args: [
      new Arg({ name: 'is_dm', type: 'boolean', help: 'Whether msg was a DM or not', hidden: true }),
    ]
  })
}

export const make_join_game_command = (func) => {
  return new Command({
    name: 'join_game',
    alias: 'J',
    help: 'Join specified game.',
    func: func,
    pos_args: [
      new Arg({ name: 'game_id', type: 'string', help: 'Joins specified game' }),
    ],
    args: [
      new Arg({ name: 'is_dm', type: 'boolean', help: 'Whether msg was a DM or not', hidden: true }),
      new Arg({ name: 'password', alias: 'p', type: 'string', nullable: true, default_value: null, help: 'Password to join game. Required if game has one' }),
    ],
  })
}

export const make_exit_game_command = (func) => {
  return new Command({
    name: 'exit_game',
    alias: 'X',
    help: "Leave a game that you've joined",
    func: func,
    pos_args: [],
    args: [
      new Arg({ name: 'is_dm', type: 'boolean', help: 'Whether msg was a DM or not', hidden: true }),
    ],
  })
}

export const make_server_lobby_command = (func) => {
  return new Command({
    name: 'server_lobby',
    alias: 'L',
    help: 'Show all games on the server.',
    func: func,
    pos_args: [],
    args: [
      new Arg({ name: 'is_dm', type: 'boolean', help: 'Whether msg was a DM or not', hidden: true }),
      new Arg({ name: 'game_id', alias: 'i', type: 'string', nullable: true, default_value: null, help: 'If valid game ID is provided, shows a detailed view of specified game instead of entire lobby' }),
    ]
  })
}