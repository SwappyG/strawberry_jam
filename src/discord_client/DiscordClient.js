import { existsSync, readFileSync } from 'fs'
import { parseArgsStringToArgv } from 'string-argv'
import minimist from 'minimist';

import { Constants, Client } from 'discord.js'

import { is_alphanumeric, random_str } from "../utils/String.js"
import { help_str } from './Help.js';
import { GameData } from './Game.js';
import { Mutex } from 'async-mutex';

import { log_and_reply } from '../utils/DiscordMsg.js';
import { cyan_block, code_block } from '../utils/DiscordFormat.js';
import { make_ret } from '../utils/Return.js';
import { Commands } from '../utils/Commands.js';
import { Arg } from '../utils/Arg.js';
import { make_exit_game_command, make_join_game_command, make_new_game_command, make_kill_game_command, make_server_lobby_command } from './DiscordClientCommands.js';


const _DISCORD_PREFIX = "?"

class DiscordClient {
  constructor({ discord_token_file_path, game_type, prefix }) {
    this.prefix = prefix ?? _DISCORD_PREFIX
    this._client = new Client()

    this._client.on(Constants.Events.CLIENT_READY, this._on_discord_ready)
    this._client.on(Constants.Events.MESSAGE_CREATE, this._on_discord_message)

    if (existsSync(discord_token_file_path)) {
      console.log(`found discord token file, parsing and logging in`)
      this._is_running_on_heroku = false
      this._client.login(JSON.parse(readFileSync(discord_token_file_path)).discord_token)
    } else if (process.env.DISCORD_TOKEN) {
      console.log(`found discord token env variable, logging in`)
      this._is_running_on_heroku = true
      this._client.login(process.env.DISCORD_TOKEN)
    } else {
      throw new Error(`Failed to find discord token`)
    }

    this._game_type = game_type
    this._games = {}
    this._users = {}
    this._cmds = this._make_commands()
    this._game_cmds = {}

    this._mutex = new Mutex()
  }

  _make_commands = () => {
    const cmds = new Commands()
    cmds.add(make_exit_game_command(this._exit_game))
    cmds.add(make_join_game_command(this._join_game))
    cmds.add(make_new_game_command(this._new_game, {
      pos_args: [],
      args: [...this._game_type.get_args()]
    }))
    cmds.add(make_kill_game_command(this._kill_game))
    cmds.add(make_server_lobby_command(this._show_games))
    return cmds
  }

  _new_game = async ({ discord_user, args }) => {
    const game_id = random_str(4)

    const { success, reply_msg, dm_msg, ...rest } = this._game_type.create({ game_id, args, prefix: this.prefix })
    if (!success) {
      return { success, reply_msg }
    }

    const error_callback = async (error, users_in_game) => {
      console.log(`Game \`${game_id}\` has crashed, got [${error}]`)
      await this._mutex.runExclusive(async () => {
        users_in_game.forEach((discord_user) => {
          delete this._users[discord_user.id]
        })
        delete this._games[game_id]
      })
    }

    await this._mutex.runExclusive(async () => {
      this._games[game_id] = new GameData({
        'id': game_id,
        'creator_name': discord_user.username,
        'creator_id': discord_user.id,
        'password': args.password,
        'max_players': rest.game.options.max_players,
        'is_heroku': this._is_running_on_heroku,
        'game': rest.game,
        'commands': rest.game.get_commands(),
        'error_callback': error_callback
      })
    })

    return make_ret(true, `A new game with ID \`${game_id}\` was created`)
  }

  _kill_game = async ({ discord_user, args }) => {
    const game_id = args["_"][0]
    const { success, reply_msg, dm_msg, ...rest } = await this._mutex.runExclusive(async () => {
      if (this._games[game_id] === undefined) {
        return make_ret(false, `There is no game with ID: \`${game_id}\``)
      }

      if (this._games[game_id].creator_id !== discord_user.id) {
        return make_ret(false, `Only the creator of the game can kill it`)
      }

      this._games[game_id].end_game(`The game was killed by ${discord_user.username}`)
      delete this._games[game_id]
      return make_ret(true)
    })

    if (!success) {
      return { success, reply_msg }
    }
    return make_ret(true, `Killed game with ID: \`${game_id}\``)
  }

  _join_game = async ({ discord_user, args }) => {
    const game_id = args["_"][0]
    const { success, reply_msg, dm_msg, ...rest } = await this._mutex.runExclusive(async () => {
      if (this._games[game_id] === undefined) {
        return make_ret(false, `There is no game with ID: \`${game_id}\``)
      }

      if (this._users[discord_user.id] !== undefined) {
        return make_ret(false, `You are already in a game with ID: \`${this._users[discord_user.id].game_id}\``)
      }

      if (this._games[game_id].creator_id !== discord_user.id) {
        const password = args?.password ?? args?.p ?? null
        if (this._games[game_id].password !== null && password === null) {
          return make_ret(false, `Game ${game_id} has a password, you must provide it with \`--password <key>\` or \`--p <key>\``)
        }

        if (this._games[game_id].password !== password) {
          return make_ret(false, `Incorrect password, try again. The password is case sensitive.`)
        }
      }

      const { success, reply_msg, dm_msg, ...rest } = await this._games[game_id].game.join(discord_user)
      if (!success) {
        return { success, reply_msg }
      }

      this._users[discord_user.id] = {
        'user': discord_user,
        'game_id': game_id
      }
      return make_ret(true)
    })

    if (!success) {
      return { success, reply_msg }
    }

    return make_ret(true, `You've joined game \`${game_id}\`! From here on, DM all commands. **DON'T MSG IN PUBLIC CHANNEL**`)
  }

  _exit_game = async ({ discord_user }) => {
    const { success, reply_msg, dm_msg, ...rest } = await this._mutex.runExclusive(async () => {
      if (this._users[discord_user.id] === undefined) {
        return make_ret(false, `You aren't in any game`)
      }

      const game_id = this._users[discord_user.id].game_id
      const { success, reply_msg, dm_msg, ...rest } = await this._games[game_id].game.exit(discord_user)
      if (!success) {
        console.log(`reply_msg: ${reply_msg}`)
        return { success, reply_msg }
      }

      delete this._users[discord_user.id]
      return make_ret(true, null, null, { game_id })
    })

    if (!success) {
      console.log(`reply_msg: ${reply_msg}`)
      return { success, reply_msg }
    }

    return make_ret(true, `You've left game \`${rest.game_id}\``)
  }

  _show_games = async ({ args }) => {
    let ret = `${cyan_block('Available Games')}`

    const { success, reply_msg, ...rest } = await this._mutex.runExclusive(async () => {
      if (args.game_id) {
        if (this._games[args.game_id] === undefined) {
          return make_ret(false, `There is no game with ID ${args.game_id}`)
        }
        return make_ret(true, `${await this._games[args.game_id].format_for_lobby(true)}`)
      }

      for (const [id, data] of Object.entries(this._games)) {
        ret = `${ret}\n${await data.format_for_lobby()}`
      }
      return make_ret(true, ret)
    })

    return { success, reply_msg }
  }

  _on_discord_ready = () => {
    console.log(`Logged in as ${this._client.user.tag}!`)
    console.log('This bot is part of the following guilds:')
    this._client.guilds.cache.forEach((guild, id) => {
      console.log(`  - ${guild.name} : ${id}`)
    })
  }

  _on_discord_message = async (msg) => {
    try {
      if (msg.author.bot) {
        return
      }

      const trimmed_msg = msg.content.trim()
      if (trimmed_msg[0] != _DISCORD_PREFIX) {
        return
      }

      if (this._is_idle) {
        this._start_game()
        msg.author.send(`I've awakened from my slumber`)
      }

      const cmd_line_args = minimist(parseArgsStringToArgv(trimmed_msg.slice(1)))
      cmd_line_args.is_dm = msg.channel.type === "dm"

      const author_name = msg?.member?.displayName ?? msg.author.username
      const guild_name = msg?.guild ?? 'DM'
      const channel_name = msg?.channel.name ?? "-"
      console.log(`\nReceived msg from [${author_name}] at [${guild_name}: ${channel_name}]`)
      console.log(cmd_line_args)

      // if (['help', 'h'].includes(args["_"][0])) {
      //   let help_msg = `${cyan_block('Server Commands')}\n${help_str(this.prefix)}`
      //   if (this._users[msg.author.id] !== undefined) {
      //     console.log(this._users[msg.author.id])
      //     const game_id = this._users[msg.author.id].game_id
      //     help_msg = `${help_msg}\n${cyan_block('Game Specific Commands')}\n${await this._games[game_id].game.help(msg.author.id)}`
      //   }
      //   return log_and_reply(msg, help_msg)
      // }

      const { success, reply_msg, dm_msg } = await this._cmds.call({ cmd_line_args: cmd_line_args, discord_user: msg.author })
      console.log(`Result: ${success}`)
      reply_msg != null && msg.reply(reply_msg)
      dm_msg != null && msg.author.send(dm_msg)

      // if (this._cmds[args["_"][0]] !== undefined) {
      //   const temp = await this._cmds[args["_"][0]](msg, args)
      //   console.log(temp)
      //   const { success, reply_msg, dm_msg, ...rest } = temp // await this._cmds[args["_"][0]](msg, args)
      //   reply_msg != null && msg.reply(reply_msg)
      //   dm_msg != null && msg.author.send(dm_msg)
      //   return
      // }

      // if (this._users[msg.author.id] === undefined && !args.game) {
      //   return log_and_reply(msg, `You aren't part of any game, so to make game specific commands, use \`--game\` flag with \`<game id>\``)
      // }

      // const game_id = this._users[msg.author.id]?.game_id ?? args.game_id
      // if (this._games[game_id] === undefined) {
      //   return log_and_reply(msg, `The game id \`${game_id} doesn't correspond to any existing game.\``)
      // }

      // const { success, reply_msg, dm_msg } = await this._games[game_id].call({
      //   discord_user: msg.author,
      //   args: args
      // })

      // console.log(`reply_msg: ${reply_msg}`)
      // reply_msg != null && msg.reply(reply_msg)
      // dm_msg != null && msg.author.send(dm_msg)
    } catch (e) {
      log_and_reply(msg, `Caught exception while processing message: \n\n${code_block(e.stack)}\``)
    }
  }
}

export {
  DiscordClient
}