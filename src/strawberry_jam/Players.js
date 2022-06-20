import { Player } from "./Player.js"
import { format_clue_tokens } from "./FormatOutput.js"
import { format_score_breakdown, strawberries_from_score } from "./Score.js"

import { make_ret } from "../utils/Return.js"

export class Players {
  constructor(max_players) {
    this._players = new Map()
    this._max_players = max_players
  }

  add_player = ({ discord_user, length_of_words }) => {
    if (this._players.has(discord_user.id)) {
      return make_ret(false, `${discord_user.username} has already joined`)
    }

    if (this._players.size >= this._max_players) {
      return make_ret(false, `The game lobby is full`)
    }

    this._players.set(discord_user.id, new Player({ discord_user, length_of_words }))
    return make_ret(true)
  }

  remove_player = (discord_user) => {
    if (!this._players.has(discord_user.id)) {
      return make_ret(false, `\`${discord_user.name}\` was not in the game`)
    }

    this._players.delete(discord_user.id)
    return make_ret(true)
  }

  apply_to_player = (discord_user, callable) => {
    if (!this._players.has(discord_user.id)) {
      return make_ret(false, `\`${discord_user.username}\` was not in the game`)
    }
    return callable(this._players.get(discord_user.id))
  }

  assign_word_to_all_players = (discord_user, options) => {
    if (!this._players.has(discord_user.id)) {
      return make_ret(false, `You aren't in the game, you can't assign words`)
    }

    const num_players = this.num()
    if (!(options?.allow_single_player) && (num_players < 2)) {
      return make_ret(false, `At least 2 players are required to play`)
    }

    const players_that_havent_set_word = [...this._players].filter(([k, p]) => p.is_choosing_word()).map(([k, p]) => p.name)
    if (players_that_havent_set_word.length > 0) {
      return make_ret(false, `_ _\n\nThe following players haven't selected a word \`\`\`${players_that_havent_set_word.map(p => `\n - ${p}`)}\`\`\``)
    }

    let prev_word = [...this._players][this._players.size - 1][1].word
    let ii = 1
    for (const [id, player] of this._players) {
      player.assign_word(prev_word, ii)
      ii = ii + 1
      prev_word = player.word.slice()
    }

    return make_ret(true)
  }

  add_votes = (voter_id, votes) => {
    let player = this.get_player(voter_id)
    if (player === null) {
      return make_ret(false, `You can't vote if you're not in the game`)
    }

    if (votes.some(v => v > this.num())) {
      return make_ret(false, `Your indices must correspond to player nums, ie they must be between \`1\` and \`${this.num()}\``)
    }

    const dupes = votes.filter((v, ii) => votes.indexOf(v) !== ii)
    if (dupes.length > 0) {
      return make_ret(false, `Your indices cannot have duplicates, The follow were repeated: \`${dupes}\``)
    }

    player.votes = votes
    const names = votes.map(num => [...this._players].find(([id, p]) => p.num === num)[1].name)
    return make_ret(true, null, null, { yes_vote_names: names })
  }

  end_round = () => {
    this._players.forEach((p) => p.round_complete())
    return make_ret(true)
  }

  msg_everyone = (text) => {
    for (const [id, player] of this._players) {
      player.send(text)
    }
  }

  display_board_to_everyone = () => {
    this._players.forEach(([id, p]) => p.send(this._format_board(id)))
  }

  num = () => {
    return this._players.size
  }

  get = () => {
    return this._players
  }

  get_player = (discord_id) => {
    return this._players.get(discord_id) ?? null
  }

  get_max_char_of_names = () => {
    return [...this._players].reduce((prev, [id, player]) => {
      return player.name.length > prev ? player.name.length : prev
    }, 0)
  }

  get_player_active_letter_by_num = (num) => {
    for (const [id, player] of this._players) {
      if (player.num === num) {
        return player.get_active_letter()
      }
    }
    return null
  }

  get_player_clues_given = () => {
    return [...this._players].map(([id, p]) => p.hints_given)
  }

  all_players_done_responded_to_hint = () => {
    return [...this._players].every(([id, p]) => p.is_ready() || p.is_giving_hint())
  }

  all_players_have_final_guess = () => {
    return [...this._players].every(([id, p]) => p.final_guess !== null)
  }

  all_players_met_required_clues = () => {
    const req_hints = () => {
      if (this._players.size === 2) { return 3 }
      if (this._players.size === 3) { return 2 }
      return 1
    }
    return [...this._players].every(([id, p]) => p.hints_given >= req_hints())
  }

  format_player_states = () => {
    if (this._players.size === 0) {
      return `_ _\n\nThe game has no players\n`
    }

    const len_names = this.get_max_char_of_names() + 4
    const header = `_ _\n\nGame Lobby`
    let ret = ``
    for (const [id, player] of this._players) {
      const name = player.name + ' '.repeat(len_names - player.name.length)
      const num = `< ${player.num !== null ? player.num : '?'} >`
      const clues = format_clue_tokens(player.hints_given)
      const state = `${player.state}`

      ret = `${ret}\n${num} ${name} / ${clues} / ${state}`
    }

    return `${header}\n\`\`\`${ret}\`\`\``
  }

  format_for_board = (discord_id) => {
    const len_names = this.get_max_char_of_names() + 4
    let ret = ''
    for (const [ii, player] of this._players) {
      const cards = player.format_cards(discord_id === player.id)
      const name = player.name + ' '.repeat(len_names - player.name.length)
      const num = `< ${player.num !== null ? player.num : '?'} >`
      const clues = format_clue_tokens(player.hints_given)
      const state = `${player.state}`

      ret = `${ret}${ii === 0 ? "" : "\n"}${num} ${name} ${cards} // ${clues} / ${state}`
    }
    return `${ret}`
  }

  format_results = () => {
    let ret = ''

    const len_names = this.get_max_char_of_names() + 4
    let correct_words = 0
    let bonus_letters = 0
    for (const [id, player] of this._players) {
      const index = `< ${player.num} >`
      const name = `${player.name}`
      const name_spacer = `${' '.repeat(len_names - name.length)}`
      const unshuffled = `[${player.assigned_word_unshuffled}]`
      const assigned = `[${player.assigned_word}]`
      const guess = `[${player.final_guess}]`
      const voted = player.votes !== null ? "VOTED" : "NO_VOTE"
      const votes = [...this._players].reduce((accum, [id, p]) => {
        return accum + ((p.votes === null) ? 0 : p.votes.includes(player.num))
      }, 0)
      const vote_fraction = `(${(votes / this.num() * 100).toFixed(1)}%)`

      if (votes / this.num() > 0.5) {
        correct_words = correct_words + 1
        bonus_letters = bonus_letters + player.final_guess.length - player.length_of_words
      }
      ret = `${ret}\n${index} ${name}${name_spacer}${unshuffled} ${assigned} / ${guess} / ${vote_fraction} / ${voted}`
    }

    const score = correct_words * [...this._players][0][1].length_of_words * 3 + bonus_letters * 1
    const score_chart = format_score_breakdown(this.num())

    return `_ _\n\nFinal Results\n\n\`\`\`Score: (${score}) ${strawberries_from_score(score, this.num())}\n${ret}\`\`\`\n\nScore Chart:\n${score_chart}`
  }
}