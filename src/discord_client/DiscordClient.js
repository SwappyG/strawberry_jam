import { existsSync, readFileSync } from 'fs'
import { parseArgsStringToArgv } from 'string-argv'
import minimist from 'minimist';
import fetch from "node-fetch"

import { Constants, Client } from 'discord.js'

import { random_str } from "../utils/String.js"

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
    this._cmds = {}
    this._make_commands()
  }

  _add_commands = (cmds, func) => {
    if (!Array.isArray(cmds)) {
      cmds = [cmds]
    }
    for (const c of cmds) {
      this._cmds[c] = func
    }
  }

  _make_commands = () => {
    this._add_commands(['server_lobby', 'L'], this._show_games)
    this._add_commands(['new_game', 'N'], this._new_game)
    this._add_commands(['join_game', 'J'], this._join_game)
    this._add_commands(['exit_game', 'X'], this._exit_game)
    this._add_commands(['kill_game', 'K'], this._kill_game)
  }

  _make_heroku_dyno_pinger = (id) => {
    setInterval(() => {
      if (this._is_running_on_heroku) {
        fetch("http://swappy-jam.herokuapp.com", { method: 'GET' })
          .then(console.log(`successfully pinged heroku app`))
          .catch(reason => {
            this._end_game(id, `Can't contact server, got [${reason}], exiting`)
          })
      }
      if (Date.now() - this._games[id].last_cmd_timestamp > 15 * 60 * 1000) {
        this._end_game(id, `No msgs received in the last 15 minutes. Any active game will be ended`)
      }
    }, 15 * 60 * 1000)
  }

  _end_game = async (game_id, reason) => {
    if (reason) {
      this.msg_everyone_in_game(game_id, reason)
    }
    clearInterval(this._games[game_id].heroku_dyno_pinger)
    this._games[game_id].heroku_dyno_pinger = null
    this._games[game_id].is_idle = true
    this._games[game_id].game = null
    for (const user of this._games[game_id].users) {
      delete this._users[user.id]
    }
    this._games[game_id].users = []
  }

  _new_game = async (msg, args) => {
    const game_id = random_str(4)
    const callbacks = {
      'reply': this.log_and_reply,
      'msg_everyone': (text) => { this.msg_everyone_in_game(game_id, text) },
      'msg_user': (user_id, text) => { this.msg_user(user_id, text) },
      'prefix': () => { return this.prefix }
    }

    const [success, ...ret] = this._game_generator(game_id, args, callbacks)
    if (!success) {
      return this.log_and_reply(msg, ret[0])
    }

    const game = ret[0]
    const commands = game.get_commands().reduce((accum, [cmds, func]) => {
      if (!Array.isArray(cmds)) {
        cmds = [cmds]
      }
      cmds.forEach(cmd => { accum[cmd] = func })
      return accum
    }, {})

    this._games[game_id] = {
      'id': game_id,
      'creator': msg.author.username,
      'creator_id': msg.author.id,
      'users': [],
      'max_players': args?.max_players ?? 6,
      'is_idle': false,
      'last_cmd_timestamp': Date.now(),
      'heroku_dyno_pinger': this._make_heroku_dyno_pinger(game_id),
      'game': ret[0],
      'commands': commands
    }
    this.log_and_reply(msg, `A new game with ID \`${game_id}\` was created`)
  }

  _kill_game = async (msg, args) => {
    if (args["_"].length < 2) {
      return this.log_and_reply(msg, `You need to specify ID of game to kill`)
    }

    const game_id = args["_"][1]
    if (this._games[game_id] === undefined) {
      return this.log_and_reply(msg, `There is no game with ID: \`${game_id}\``)
    }

    this._end_game(game_id, `The game was killed by ${msg.author.username}`)
    delete this._games[game_id]

    this.log_and_reply(msg, `Killed game with ID: \`${game_id}\``)
  }

  _join_game = async (msg, args) => {
    if (args["_"].length < 2) {
      return this.log_and_reply(msg, `You need to specify ID of game to join`)
    }

    const game_id = args["_"][1]
    if (this._games[game_id] === undefined) {
      return this.log_and_reply(msg, `There is no game with ID: \`${game_id}\``)
    }

    if (this._users[msg.author.id] !== undefined) {
      return this.log_and_reply(msg, `You are already in a game wiht ID: \`${this._users[msg.author.id].game_id}\``)
    }

    console.log(this._games[game_id].game.join)
    const [success, ...ret] = await this._games[game_id].game.join(msg.author.id, msg.author.username)
    if (!success) {
      return this.log_and_reply(msg, ret[0])
    }

    this.add_user(game_id, msg.author)
    this.log_and_reply(msg, `You've joined the game! From here on, DM all commands, DON'T MSG IN PUBLIC CHANNEL`)
    this.msg_everyone_in_game(game_id, `${msg.author.username} has joined the game!`)
  }

  _exit_game = async (msg, args) => {
    const [game_id, game] = Object.entries(this._games).find(([id, data]) => {
      return data.users.find(user => { user.id === msg.author.id }) !== null
    })

    if (game_id === undefined || this._users[msg.author.id] === undefined) {
      return this.log_and_reply(msg, `You aren't in any games`)
    }

    const [success, ...ret] = this._game[game_id].exit(msg.author.id)
    if (!success) {
      return this.log_and_reply(msg, ret[0])
    }

    this.remove_user(game_id, msg.author.id)
    this._discord_cli.msg_everyone(game_id, `${msg.author.username} has left the game`)
    this._discord_cli.log_and_reply(msg, `You've left game \`${game_id}\``)
  }

  _show_games = async (msg, args) => {
    let ret = '_ _\n\nAvailable Games'

    if (args.id) {
      if (this._games[args.id] === undefined) {
        return this.log_and_reply(`There is no game with ID ${args.id}`)
      }

      const game = this._games[args.id].game
      const creator = this._games[args.id].creator
      return this.log_and_reply(msg, `_ _\n\nLobby Info for \`${args.id}\`:\nCreated By: ${creator}\n${await game.format_for_lobby(true)}`)
    }

    for (const [id, data] of Object.entries(this._games)) {
      ret = `${ret}\n\` - [${id}] / Created by ${data.creator} / ${await data.game.format_for_lobby()}\``
    }
    this.log_and_reply(msg, ret)
  }

  add_user = (game_id, user) => {
    console.log(`Adding user: ${user.username}, id: ${user.id} to game \`${game_id}\``)
    this._games[game_id].users.push(user)
    this._users[user.id] = {
      'user': user,
      'game_id': game_id
    }
  }

  remove_user = (game_id, user_id) => {
    const index = this._games[game_id].users.findIndex(user => { user.id === user_id })
    if (index !== -1) {
      console.log(`Removing user: ${this._games[game_id].users[index].username}, id: ${user_id} from game \`${game_id}\``)
      this._games[game_id].users.splice(index, 1)
      delete this._users[user_id]
    }
  }

  add_game_command = (game_id, names, callback) => {
    console.log(game_id)
    console.log(this._games)
    if (!Array.isArray(names)) {
      names = [names]
    }
    for (const n of names) {
      this._games[game_id].commands[n] = callback
    }
  }

  log_and_reply = (discord_msg, text) => {
    console.log(text)
    discord_msg.reply(text)
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
    for (const user of this._games[game_id].users) {
      user.send(text)
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

      if (this._cmds[args["_"][0]] !== undefined) {
        return await this._cmds[args["_"][0]](msg, args)
      }

      if (this._users[msg.author.id] === undefined && !args.game) {
        return this.log_and_reply(msg, `You aren't part of any game, so to make game specific commands, use \`--game\` flag with \`<game id>\``)
      }

      const game_id = this._users[msg.author.id]?.game_id ?? args.game_id
      if (this._games[game_id] === undefined) {
        return this.log_and_reply(msg, `The game id \`${game_id} doesn't correspond to any existing game.\``)
      }

      if (this._games[game_id].commands[args["_"][0]] === undefined) {
        return this.log_and_reply(msg, `Command ${trimmed_msg} is invalid, try ?help for proper syntax`)
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