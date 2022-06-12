import { Player } from "./Player.js"
import { format_clue_tokens } from "./FormatOutput.js"
import { format_score_breakdown } from "./Score.js"

export class Players {
  constructor(max_players) {
    this._players = new Map()
    this._max_players = max_players
  }

  add_player = ({ discord_user, length_of_words }) => {
    if (this._players.has(discord_user.id)) {
      return [false, `${name} has already joined`]
    }

    if (this._players.size() >= this._max_players) {
      return [false, `The game lobby is full`]
    }

    this._players.set(discord_user.id, new Player({ discord_user, length_of_words }))
    return [true, `${discord_user.username} has been added to the game`]
  }

  remove_player = (discord_user) => {
    if (!this._players.has(discord_user.id)) {
      return [false, `\`${discord_user.name}\` was not in the game`]
    }

    const name = this._players.get(discord_user.id).name.slice()
    this._players.delete(discord_user.id)
    return [true, `${name} has left the game`]
  }

  apply_to_player = (discord_user, callable) => {
    if (!this._players.has(discord_user.id)) {
      return [false, `\`${discord_user.username}\` was not in the game`]
    }
    return callable(this._players.get(discord_user.id))
  }

  assign_word_to_all_players = (discord_user, options) => {
    if (!this._players.has(discord_user.id)) {
      return [false, `\`${discord_user.username}\` was not in the game`]
    }

    const num_players = this.num()
    if (!(options?.allow_single_player) && (num_players < 2)) {
      return [false, `At least 2 players are required to play`]
    }

    const players_that_havent_set_word = this.players.entries().filter(([k, p]) => p.is_waiting_for_assigned_word()).map(p => p.name)
    if (players_that_havent_set_word.length > 0) {
      return [false, `The following players haven't selected a word ${players_that_havent_set_word}`]
    }

    let prev_word = this._players.entries()[this._players.size() - 1][1].word
    let ii = 1
    for (const [id, player] of this._players) {
      player.assign_word(prev_word, ii)
      ii = ii + 1
      prev_word = player.word.slice()
      console.log(`assigned word to ${player.name}`)
    }
    return [true, `All players have been assigned their word. The game has been started`]
  }

  add_votes = (voter_id, votes) => {
    let player = this.get_player(voter_id)
    if (player === null) {
      return [false, `You can't vote if you're not in the game`]
    }

    const vote_indices = votes.toString().split(',')
    if (vote_indices.length !== [...new Set(vote_indices)].length) {
      return [false, `You can't have duplicate indices when for your votes`]
    }

    const votes_int = vote_indices.map(v => parseInt(v))
    if (votes_int.some(v => isNaN(v))) {
      return [false, `Your votes must be integers`]
    }

    if (votes_int.some(v => v < 1 || v > this.num())) {
      return [false, `Your indices must correspond to player nums, ie they must be between \`1\` and \`${this.num()}\``]
    }

    player.votes = votes_int
    const names = votes_int.map(num => this._players.entries().find(p => p.num === num).name)
    return [true, `${player.name} believes [${names.join(', ')}] have proper words`]
  }

  end_round = () => {
    this.players.entries().forEach(p => p.round_complete())
  }

  num = () => {
    return this._players.size()
  }

  get = () => {
    return this._players
  }

  get_player = (discord_id) => {
    return this._players.get(discord_id) ?? null
  }

  get_max_char_of_names = () => {
    return this.players.entries().reduce((prev, [id, player]) => {
      return player.name.length > prev ? player.name.length : prev
    }, 0)
  }

  get_players_with_no_word = () => {
    return this.players.entries().filter(([id, p]) => p.is_waiting_for_assigned_word()).map(p => p.name)
  }

  get_player_active_letter_by_num = (num) => {
    for (const p of this._players) {
      if (p.num == num) {
        return p.get_active_letter()
      }
    }
    return null
  }

  get_player_clues_given = () => {
    return this.players.entries().map(([id, p]) => p.hints_given)
  }

  all_players_done_responding_to_hint = () => {
    return this.players.entries().every(([id, p]) => p.is_ready() || p.is_giving_hint())
  }

  all_players_have_final_guess = () => {
    return this._players.entries().every(([id, p]) => p.final_guess !== null)
  }

  all_players_met_required_clues = () => {
    const req_hints = () => {
      if (this._players.size() === 2) { return 3 }
      if (this._players.size() === 3) { return 2 }
      return 1
    }
    return this._players.entries().every(([id, p]) => p.hints_given >= req_hints())
  }

  format_player_states = () => {
    if (this._players.size() === 0) {
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
      const cards = player.format_cards(player, discord_id === player.id)
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
    for (const player of this._players) {
      const index = `< ${player.num} >`
      const name = `${player.name}`
      const name_spacer = `${' '.repeat(len_names - name.length)}`
      const unshuffled = `[${player.assigned_word_unshuffled}]`
      const assigned = `[${player.assigned_word}]`
      const guess = `[${player.final_guess}]`
      const voted = player.votes !== null ? "VOTED" : "NO_VOTE"
      const votes = this._players.entries().reduce((accum, [id, p]) => {
        return accum + ((p.votes === null) ? 0 : p.votes.includes(player.num))
      }, 0)
      const vote_fraction = `(${(votes / this.num() * 100).toFixed(1)}%)`

      console.log(`player: ${player.name}`)
      console.log(`votes: ${votes}`)
      console.log(`voted: ${voted}`)
      if (votes / this.num() > 0.5) {
        correct_words = correct_words + 1
        bonus_letters = bonus_letters + player.final_guess.length - player.length_of_words
      }
      ret = `${ret}\n${index} ${name}${name_spacer}${unshuffled} ${assigned} / ${guess} / ${vote_fraction} / ${voted}`
    }

    console.log(`correct_words: ${correct_words}`)
    console.log(`bonus_letters: ${bonus_letters}`)
    const score = correct_words * this._players.entries()[0][1].length_of_words * 3 + bonus_letters * 1
    const score_chart = format_score_breakdown(this.num())

    return `_ _\n\nFinal Results\n\n\`\`\`Score: ${score}\n${ret}\`\`\`\n\nScore Chart:\n${score_chart}`
  }
}