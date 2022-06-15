import { existsSync, readFileSync } from 'fs'
import { parseArgsStringToArgv } from 'string-argv'
import minimist from 'minimist';

import { Constants, Client } from 'discord.js'

import { is_alphanumeric, random_str } from "../utils/String.js"
import { help_str } from './Help.js';
import { GameData } from './Game.js';
import { Mutex } from 'async-mutex';

import { log_and_reply } from '../utils/DiscordMsg.js';
import { cyan_block } from '../utils/DiscordFormat.js';
import { make_ret } from '../utils/Return.js';


const _DISCORD_PREFIX = "?"

class DiscordClient {
  constructor({ discord_token_file_path, game_generator, prefix }) {
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

    this._game_generator = game_generator
    this._games = {}
    this._users = {}
    this._cmds = this._make_commands()

    this._mutex = new Mutex()
  }

  _make_commands = () => {
    const cmds = [
      [['server_lobby', 'L'], this._show_games],
      [['new_game', 'N'], this._new_game],
      [['join_game', 'J'], this._join_game],
      [['exit_game', 'X'], this._exit_game],
      [['kill_game', 'K'], this._kill_game],
    ]

    return cmds.reduce((accum, [cs, func]) => {
      cs.forEach(c => accum[c] = func)
      return accum
    }, {})
  }

  _new_game = async (msg, args) => {
    console.log('1')
    const password = args?.password ?? args?.p ?? null
    if (password !== null) {
      console.log('3')
      if (typeof password !== 'string' || !is_alphanumeric(password)) {
        console.log('5')
        return make_ret(false, `Password, if provided, must be a proper alphanumeric string`)
      }
    }
    console.log('4')
    const game_id = random_str(4)

    console.log('2')
    const { success, reply_msg, dm_msg, ...rest } = this._game_generator(game_id, args, this.prefix)
    if (!success) {
      return { success, reply_msg }
    }

    console.log('1')
    const error_callback = async (error, users_in_game) => {
      console.log(`Game \`${game_id}\` has crashed, got [${error}]`)
      await this._mutex.runExclusive(async () => {
        users_in_game.forEach((discord_user) => {
          delete this._users[discord_user.id]
        })
        delete this._games[game_id]
      })
    }

    console.log('1')
    await this._mutex.runExclusive(async () => {
      this._games[game_id] = new GameData({
        'id': game_id,
        'creator_name': msg.author.username,
        'creator_id': msg.author.id,
        'password': password,
        'max_players': args?.max_players ?? 6,
        'is_heroku': this._is_running_on_heroku,
        'game': rest.game,
        'commands': rest.game.get_commands(),
        'error_callback': error_callback
      })
    })

    return make_ret(true, `A new game with ID \`${game_id}\` was created`)
  }

  _kill_game = async (msg, args) => {
    if (args["_"].length < 2) {
      return make_ret(true, `You need to specify ID of game to kill`)
    }

    const game_id = args["_"][1]
    const { success, reply_msg, dm_msg, ...rest } = await this._mutex.runExclusive(async () => {
      if (this._games[game_id] === undefined) {
        return make_ret(false, `There is no game with ID: \`${game_id}\``)
      }

      if (this._games[game_id].creator_id !== msg.author.id) {
        return make_ret(false, `Only the creator of the game can kill it`)
      }

      this._games[game_id].end_game(`The game was killed by ${msg.author.username}`)
      delete this._games[game_id]
      return make_ret(true)
    })

    if (!success) {
      return { success, reply_msg }
    }
    return make_ret(true, `Killed game with ID: \`${game_id}\``)
  }

  _join_game = async (msg, args) => {
    if (args["_"].length < 2) {
      return log_and_reply(msg, `You need to specify ID of game to join`)
    }

    const game_id = args["_"][1]
    const { success, reply_msg, dm_msg, ...rest } = await this._mutex.runExclusive(async () => {
      if (this._games[game_id] === undefined) {
        return make_ret(false, `There is no game with ID: \`${game_id}\``)
      }

      if (this._users[msg.author.id] !== undefined) {
        return make_ret(false, `You are already in a game with ID: \`${this._users[msg.author.id].game_id}\``)
      }

      if (this._games[game_id].creator_id !== msg.author.id) {
        const password = args?.password ?? args?.p ?? null
        if (this._games[game_id].password !== null && password === null) {
          return make_ret(false, `Game ${game_id} has a password, you must provide it with \`--password <key>\` or \`--p <key>\``)
        }

        if (this._games[game_id].password !== password) {
          return make_ret(false, `Incorrect password, try again. The password is case sensitive.`)
        }
      }

      const { success, reply_msg, dm_msg, ...rest } = await this._games[game_id].game.join(msg.author)
      if (!success) {
        return { success, reply_msg }
      }

      this._users[msg.author.id] = {
        'user': msg.author,
        'game_id': game_id
      }
      return make_ret(true)
    })

    if (!success) {
      return { success, reply_msg }
    }

    return make_ret(true, `You've joined game \`${game_id}\`! From here on, DM all commands. **DON'T MSG IN PUBLIC CHANNEL**`)
  }

  _exit_game = async (msg, args) => {
    const { success, reply_msg, dm_msg, ...rest } = await this._mutex.runExclusive(async () => {
      if (this._users[msg.author.id] === undefined) {
        return make_ret(false, `You aren't in any game`)
      }

      const game_id = this._users[msg.author.id].game_id
      const { success, reply_msg, dm_msg, ...rest } = await this._games[game_id].game.exit(msg.author)
      if (!success) {
        console.log(`reply_msg: ${reply_msg}`)
        return { success, reply_msg }
      }

      delete this._users[msg.author.id]
      return make_ret(true, null, null, { game_id })
    })

    if (!success) {
      console.log(`reply_msg: ${reply_msg}`)
      return { success, reply_msg }
    }

    return make_ret(`You've left game \`${rest.game_id}\``)
  }

  _show_games = async (msg, args) => {
    let ret = `${cyan_block('Available Games')}`

    const { success, reply_msg, ...rest } = await this._mutex.runExclusive(async () => {
      if (args.id) {
        if (this._games[args.id] === undefined) {
          return make_ret(false, `There is no game with ID ${args.id}`)
        }

        return make_ret(true, `${await this._games[args.id].format_for_lobby(true)}`)
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

      const args = minimist(parseArgsStringToArgv(trimmed_msg.slice(1)))
      args.is_dm = msg.channel.type === "dm"

      const author_name = msg?.member?.displayName ?? msg.author.username
      const guild_name = msg?.guild ?? 'DM'
      const channel_name = msg?.channel.name ?? "-"
      console.log(`\nReceived msg from [${author_name}] at [${guild_name}: ${channel_name}]`)
      console.log(args)

      if (['help', 'h'].includes(args["_"][0])) {
        let help_msg = `${cyan_block('Server Commands')}\n${help_str(this.prefix)}`
        if (this._users[msg.author.id] !== undefined) {
          console.log(this._users[msg.author.id])
          const game_id = this._users[msg.author.id].game_id
          help_msg = `${help_msg}\n${cyan_block('Game Specific Commands')}\n${await this._games[game_id].game.help(msg.author.id)}`
        }
        return log_and_reply(msg, help_msg)
      }

      console.log('1')
      if (this._cmds[args["_"][0]] !== undefined) {
        const { success, reply_msg, dm_msg, ...rest } = await this._cmds[args["_"][0]](msg, args)
        reply_msg != null && msg.reply(reply_msg)
        dm_msg != null && msg.author.send(dm_msg)
        return
      }

      console.log('2')
      if (this._users[msg.author.id] === undefined && !args.game) {
        return log_and_reply(msg, `You aren't part of any game, so to make game specific commands, use \`--game\` flag with \`<game id>\``)
      }

      console.log('3')
      const game_id = this._users[msg.author.id]?.game_id ?? args.game_id
      if (this._games[game_id] === undefined) {
        return log_and_reply(msg, `The game id \`${game_id} doesn't correspond to any existing game.\``)
      }

      const { success, reply_msg, dm_msg } = await this._games[game_id].call({
        discord_user: msg.author,
        args: args
      })

      console.log(`reply_msg: ${reply_msg}`)
      reply_msg != null && msg.reply(reply_msg)
      dm_msg != null && msg.author.send(dm_msg)
    } catch (e) {
      const err = `Caught exception while processing message: \n${e.stack}`
      console.log(err);
      msg.reply(err)
    }
  }
}

export {
  DiscordClient
}