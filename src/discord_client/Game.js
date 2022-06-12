import fetch from "node-fetch"

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

    this.users = []
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
      this.msg_everyone_in_game(game_id, reason)
    }
    clearInterval(this.watchdog)
    this.watchdog = null
    this.is_idle = true
    this.game = null
    this.users = []
  }

  join_game = (discord_user) => {
    const [success, ...ret] = await this.game.join(discord_user.id, discord_user.username)
    if (!success) {
      return [success, ...ret]
    }

    this.users.push(discord_user)
    return [true]
  }

  exit_game = (discord_user) => {
    const [success, ...ret] = this.game.exit(discord_user.id)
    if (!success) {
      return this.log_and_reply(msg, ret[0])
    }
    const index = this.users.findIndex(user => { user.id === discord_user.id })
    if (index !== -1) {
      throw new Error(`Game \`${this.id}\`: User ${discord_user.username} was removed from game, but didn't exist in \`GameData\`.`)
    }
    this.users.splice(index, 1)
    return [true]
  }

  msg_everyone = (text) => {
    console.log(text)
    for (const user of this.users) {
      user.send(text)
    }
  }

  format_for_lobby = async (detailed = false) => {
    if (detailed) {
      return `_ _\n\nLobby Info for \`${this.id}\`:\nCreated By: ${this.creator}\n${await this.game.format_for_lobby(true)}`
    }
    return `\` - [${this.id}] / Created by ${this.creator} / ${await this.game.format_for_lobby()}\``
  }


}