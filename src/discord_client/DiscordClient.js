import { existsSync, readFileSync } from 'fs'
import { parseArgsStringToArgv } from 'string-argv'
import minimist from 'minimist';

import { Constants, Client } from 'discord.js'

import { random_str } from "../utils/String.js"
import { help_str } from './Help.js';
import { GameData } from './Game.js';
import { Mutex } from 'async-mutex';

import { log_and_reply } from '../utils/DiscordMsg.js';


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
      cs.forEach(cmd => accum[c] = func)
      return accum
    }, {})
  }

  _new_game = async (msg, args) => {
    const game_id = random_str(4)
    const callbacks = {
      'reply': log_and_reply,
      'msg_everyone': (text) => { this.msg_everyone_in_game(game_id, text) },
      'msg_user': (user_id, text) => { this.msg_user(user_id, text) },
      'prefix': () => { return this.prefix }
    }

    const [success, ...ret] = this._game_generator(game_id, args, callbacks)
    if (!success) {
      return log_and_reply(msg, ret[0])
    }

    const error_callback = (error, user_ids_to_remove) => {
      user_ids_to_remove.forEach(user_id => {
        this._mutex.runExclusive(() => {
          this.msg_user(user_id, error)
          delete this._users[user_id]
        })
      })
    }

    await this._mutex.runExclusive(() => {
      this._games[game_id] = new GameData({
        'id': game_id,
        'creator': msg.author.username,
        'creator_id': msg.author.id,
        'max_players': args?.max_players ?? 6,
        'is_heroku': this._is_running_on_heroku,
        'game': ret[0],
        'commands': ret[0].get_commands(),
        'error_callback': error_callback
      })
    })

    log_and_reply(msg, `A new game with ID \`${game_id}\` was created`)
  }

  _kill_game = async (msg, args) => {
    if (args["_"].length < 2) {
      return log_and_reply(msg, `You need to specify ID of game to kill`)
    }

    const [success, ...ret] = await this._mutex.runExclusive(() => {
      const game_id = args["_"][1]
      if (this._games[game_id] === undefined) {
        return [false, `There is no game with ID: \`${game_id}\``]
      }

      this._games[game_id].end_game(`The game was killed by ${msg.author.username}`)
      delete this._games[game_id]
      return [true]
    })

    if (!success) {
      return log_and_reply(msg, ret[0])
    }
    log_and_reply(msg, `Killed game with ID: \`${game_id}\``)
  }

  _join_game = async (msg, args) => {
    if (args["_"].length < 2) {
      return log_and_reply(msg, `You need to specify ID of game to join`)
    }

    const [success, ...ret] = await this._mutex.runExclusive(() => {
      const game_id = args["_"][1]
      if (this._games[game_id] === undefined) {
        return [false, `There is no game with ID: \`${game_id}\``]
      }

      if (this._users[msg.author.id] !== undefined) {
        return [false, `You are already in a game with ID: \`${this._users[msg.author.id].game_id}\``]
      }

      const [success, ...ret] = await this._games[game_id].join_game(msg.author)
      if (!success) {
        return [success, ...ret]
      }

      this._users[msg.author.id] = {
        'user': msg.author,
        'game_id': game_id
      }
      return [true]
    })

    if (!success) {
      return log_and_reply(msg, ret[0])
    }

    log_and_reply(msg, `You've joined the game! From here on, DM all commands, DON'T MSG IN PUBLIC CHANNEL`)
    this.msg_everyone_in_game(game_id, `${msg.author.username} has joined the game!`)
  }

  _exit_game = async (msg, args) => {
    const [success, ...ret] = await this._mutex.runExclusive(() => {
      if (this._users[msg.author.id] === undefined) {
        return [false, `You aren't in any game`]
      }

      const game_id = this._users[msg.author.id].game_id
      const [success, ...ret] = this._game[game_id].exit_game(msg.author)
      if (!success) {
        return [success, ...ret]
      }

      delete this._users[user_id]
      return [true]
    })

    if (!success) {
      return log_and_reply(msg, ret[0])
    }

    this.msg_everyone_in_game(game_id, `${msg.author.username} has left the game`)
    log_and_reply(msg, `You've left game \`${game_id}\``)
  }

  _show_games = async (msg, args) => {
    let ret = '_ _\n\nAvailable Games'

    const text = await this._mutex.runExclusive(() => {
      if (args.id) {
        if (this._games[args.id] === undefined) {
          return `There is no game with ID ${args.id}`
        }

        return `${this._games[args.id].format_for_lobby(true)}`
      }

      for (const [id, data] of Object.entries(this._games)) {
        ret = `${ret}\n${await data.format_for_lobby()}\``
      }
      return ret
    })

    log_and_reply(msg, text)
  }

  msg_user = (user_id, msg) => {
    if (this._users[user_id] === undefined) {
      console.log(`msg_user called with invalid user id, ${user_id}. Registered ids:`)
      return
    }
    this._users[user_id].user.send(msg)
  }

  msg_everyone_in_game = (game_id, text) => {
    console.log(text)
    for (const user_id of this._games[game_id].user_ids) {
      this._users[user_id].send(text)
    }
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

      this._last_command_timestamp = Date.now()
      if (this._is_idle) {
        this._start_game()
        msg.author.send(`I've awakened from my slumber`)
      }

      const args = minimist(parseArgsStringToArgv(trimmed_msg.slice(1)))

      const author_name = msg?.member?.displayName ?? msg.author.username
      const guild_name = msg?.guild ?? 'DM'
      const channel_name = msg?.channel.name ?? "-"
      console.log(`\nReceived msg from [${author_name}] at [${guild_name}: ${channel_name}]`)
      console.log(args)

      if (['help', 'h'].includes(args["_"][0])) {
        let help_msg = `\`\`\`yaml\nServer Commands\n\`\`\`\n${help_str(this.prefix)}`
        if (this._users[msg.author.id] !== undefined) {
          console.log(this._users[msg.author.id])
          const game_id = this._users[msg.author.id].game_id
          help_msg = `${help_msg}\n\n**Game Specific Commands**\n\n${await this._games[game_id].game.help(msg.author.id)}`
        }
        return log_and_reply(msg, help_msg)
      }

      if (this._cmds[args["_"][0]] !== undefined) {
        return await this._cmds[args["_"][0]](msg, args)
      }

      if (this._users[msg.author.id] === undefined && !args.game) {
        return log_and_reply(msg, `You aren't part of any game, so to make game specific commands, use \`--game\` flag with \`<game id>\``)
      }

      const game_id = this._users[msg.author.id]?.game_id ?? args.game_id
      if (this._games[game_id] === undefined) {
        return log_and_reply(msg, `The game id \`${game_id} doesn't correspond to any existing game.\``)
      }

      if (this._games[game_id].commands[args["_"][0]] === undefined) {
        return log_and_reply(msg, `Command ${trimmed_msg} is unknown, try ${this.prefix}help for available commands`)
      }

      return await this._games[game_id].commands[args["_"][0]](msg, args)
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