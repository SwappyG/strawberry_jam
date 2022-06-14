import fetch from "node-fetch"
import { make_ret } from "../utils/Return.js"

const _HEROKU_ADDRESS = "http://swappy-jam.herokuapp.com"
const _HEROKU_PING_PERIOD_IN_MS = 15/*min*/ * 60/*secs/min*/ * 1000 /*msec/sec*/

export class GameData {
  constructor({ id, creator_name, creator_id, is_heroku, max_players, game, commands, error_callback }) {
    this.id = id
    this.creator_name = creator_name
    this.creator_id = creator_id
    this.max_players = max_players
    this.game = game
    this.commands = commands
    this.error_callback = error_callback

    this.is_idle = false
    this.last_cmd_timestamp = Date.now()

    this.watchdog = this._make_watchdog(is_heroku)
  }

  _make_watchdog = (is_heroku) => {
    return setInterval(() => {
      if (is_heroku) {
        fetch(_HEROKU_ADDRESS, { method: 'GET' })
          .then(console.log(`successfully pinged heroku app`))
          .catch(reason => {
            this.end_game(`Game \`this.id\`: Can't contact server, got [${reason}], exiting`)
          })
      }
      if (Date.now() - this.last_cmd_timestamp > _HEROKU_PING_PERIOD_IN_MS) {
        this.end_game(`Game \`this.id\`: No msgs received in the last ${_HEROKU_PING_PERIOD_IN_MS / 1000 / 60} minutes.`)
      }
    }, _HEROKU_PING_PERIOD_IN_MS)
  }

  end_game = async (reason) => {
    if (reason) {
      this.game.msg_everyone(reason)
    }
    clearInterval(this.watchdog)
    this.watchdog = null
    this.is_idle = true
    this.game = null
  }

  // join_game = async (discord_user) => {
  //   const { success, reply_msg, dm_msg, ...rest } = await this.game.join(discord_user)
  //   if (!success) {
  //     return { success, reply_msg }
  //   }

  //   return make_ret(true)
  // }

  // exit_game = (discord_user) => {
  //   const { success, reply_msg, dm_msg, ...rest } = this.game.exit(discord_user)
  //   if (!success) {
  //     return { success, reply_msg }
  //   }
  //   return make_ret(true)
  // }

  format_for_lobby = async (detailed = false) => {
    if (detailed) {
      return `_ _\n\nLobby Info for \`${this.id}\`:\nCreated By: ${this.creator_name}\n${await this.game.format_for_lobby(true)}`
    }
    return `\` - [${this.id}] / Created by ${this.creator_name} / ${await this.game.format_for_lobby()}\``
  }
}