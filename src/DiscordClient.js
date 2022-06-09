import { existsSync, readFileSync } from 'fs'
import { parseArgsStringToArgv } from 'string-argv'
import minimist from 'minimist';

import { Constants, Client } from 'discord.js'

const _DISCORD_PREFIX = "?"

class DiscordClient {
  constructor(args, prefix = _DISCORD_PREFIX) {
    this.prefix = prefix
    this._client = new Client()

    this._client.on(Constants.Events.CLIENT_READY, this._on_discord_ready)
    this._client.on(Constants.Events.MESSAGE_CREATE, this._on_discord_message)

    if (existsSync(args.discord_token_file_path)) {
      console.log(`found discord token file, parsing and logging in`)
      this._client.login(JSON.parse(readFileSync(args.discord_token_file_path)).discord_token)
    } else if (process.env.DISCORD_TOKEN) {
      console.log(`found discord token env variable, logging in`)
      this._client.login(process.env.DISCORD_TOKEN)
    } else {
      throw new Error(`Failed to find discord token`)
    }

    this._users = []
    this._cmds = {}
  }

  add_user = (user) => {
    console.log(`Adding user: ${user.username}, id: ${user.id}`)
    this._users.push(user)
  }

  remove_user = (user) => {
    const index = this._users.findIndex(u => u.id === user.id)
    if (index !== -1) {
      this._users.splice(index, 1)
    }
  }

  purge_users = () => {
    this._users = []
  }

  add_command = (names, callback) => {
    if (!Array.isArray(names)) {
      names = [names]
    }
    for (const n of names) {
      this._cmds[n] = callback
    }
  }

  remove_command = (name, callback) => {
    if (this._cmds[name]) {
      delete this._cmds[name]
    }
  }

  purge_commands = () => {
    this._cmds = {}
  }

  log_and_reply = (discord_msg, log_msg, dm = false) => {
    console.log(log_msg)
    if (dm) {
      discord_msg.author.send(log_msg)
    } else {
      discord_msg.reply(log_msg)
    }
  }

  msg_user = (user_id, msg) => {
    const user = this._users.find(user => user.id === user_id)
    if (!user) {
      console.log(`msg_user called with invalid user id, ${user_id}. Registered ids:`)
      for (const user in this._users) {
        console.log(` - ${user}`)
      }
      return
    }
    user.send(msg)
  }

  msg_everyone = (msg) => {
    console.log(msg)
    for (const user of this._users) {
      user.send(msg)
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

      const args = minimist(parseArgsStringToArgv(trimmed_msg.slice(1)))

      const author_name = msg?.member?.displayName ?? msg.author.username
      const guild_name = msg?.guild ?? 'DM'
      const channel_name = msg?.channel.name ?? "-"
      console.log(`\nReceived msg from [${author_name}] at [${guild_name}: ${channel_name}]`)
      console.log(args)

      if (this._cmds[args["_"][0]]) {
        return await this._cmds[args["_"][0]](msg, args)
      } else {
        return this.log_and_reply(msg, `Command ${trimmed_msg} is invalid, try ?help for proper syntax`)
      }
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