import { Player } from "./Player.js"
import { format_clue_tokens } from "./FormatOutput.js"
import { format_score_breakdown } from "./Score.js"

export class Players {
  constructor() {
    this._players = []
  }

  id_exists = (id) => {
    return this._players.findIndex(p => p.id === id) !== -1
  }

  get_player_index = (id) => {
    return this._players.findIndex(p => p.id === id)
  }

  get_player = (id) => {
    return this._players.find(p => p.id === id)
  }

  get_max_char_of_names = () => {
    return this._players.reduce((prev, curr) => {
      return curr.name.length > prev ? curr.name.length : prev
    }, 0)
  }

  players = () => {
    return this._players
  }

  num = () => {
    return this._players.length
  }

  add_player = ({ discord_id, name, length_of_words }) => {
    if (this.id_exists(discord_id)) {
      return [false, `${name} has already joined`]
    }

    if (this._players.length >= 6) {
      return [false, `The game lobby is full`]
    }

    this._players.push(new Player({ discord_id: discord_id, name: name, length_of_words: length_of_words }))
    return [true, `${name} has been added to the game`]
  }

  remove_player = (discord_id) => {
    const ii = this.get_player_index(discord_id)
    if (ii === -1) {
      return [false, `Player was not in the game`]
    }

    const name = this._players[ii].name.slice()
    this._players.splice(ii, 1)
    return [true, `${name} has left the game`]
  }

  apply_to_player = (id, callable) => {
    const ii = this.get_player_index(id)
    if (ii === -1) {
      return [false, `Player isn't in the game`]
    }
    let player = this._players[ii]

    return callable(player)
  }

  get_players_with_no_word = () => {
    let players_that_havent_set_word = []
    for (const player of this._players) {
      if (!player.is_waiting_for_assigned_word()) {
        players_that_havent_set_word.push(player.name)
      }
    }
    return players_that_havent_set_word
  }

  get_player_active_letter_by_num = (num) => {
    return this._players.find(p => p.num === num).get_active_letter()
  }

  assign_word_to_all_players = (id, options) => {
    if (!this.id_exists(id)) {
      return [false, `Player isn't in the game`]
    }

    const num_players = this.num()
    if (!(options?.allow_single_player) && (num_players < 2)) {
      return [false, `At least 2 players are required to play`]
    }

    const players_that_havent_set_word = this.get_players_with_no_word()
    if (players_that_havent_set_word.length > 0) {
      return [false, `The following players haven't selected a word ${players_that_havent_set_word}`]
    }

    let prev_word = this._players[num_players - 1].word
    let ii = 1
    for (const player of this._players) {
      console.log(`assigning word to ${player.name}`)
      player.assign_word(prev_word, ii)
      ii = ii + 1
      prev_word = player.word.slice()
      console.log(`assigned word to ${player.name}`)
    }
    return [true, `All players have been assigned their word. The game has been started`]
  }

  end_round = () => {
    for (let player of this._players) {
      player.round_complete()
    }
  }

  all_players_done_responding_to_hint = () => {
    return this._players.every(p => p.is_ready() || p.is_giving_hint())
  }

  all_players_have_final_guess = () => {
    return this._players.every(p => p.final_guess !== null)
  }

  get_player_clues_given = () => {
    return this._players.map(p => p.hints_given)
  }

  all_players_met_required_clues = () => {
    const req_hints = () => {
      if (this._players.length === 2) { return 3 }
      if (this._players.length === 3) { return 2 }
      return 1
    }
    return this._players.every(p => p.hints_given >= req_hints())
  }

  format_player_states = () => {
    if (this._players.length === 0) {
      return `_ _\n\nThe lobby is empty\n`
    }

    const len_names = this.get_max_char_of_names() + 4
    const header = `_ _\n\nGame Lobby`
    let ret = ``
    for (const player of this._players) {
      const name = player.name + ' '.repeat(len_names - player.name.length)
      const num = `< ${player.num !== null ? player.num : '?'} >`
      const clues = format_clue_tokens(player.hints_given)
      const state = `${player.state}`

      ret = `${ret}\n${num} ${name} / ${clues} / ${state}`
    }

    return `${header}\n\`\`\`${ret}\`\`\``
  }

  format_player_cards = (player, is_hidden = false) => {
    const word_len = player.assigned_word.length

    let main_cards = ('[ ]'.repeat(word_len)).split('')
    let bonus_card = `/    `
    if (player.on_bonus_letter) {
      bonus_card = is_hidden ? '/ [?]' : `/ [${player.bonus_letter.toUpperCase()}]`
    } else {
      const active_letter = player.assigned_word[player.letter_index]
      const active_letter_index = (player.letter_index + 1) * 3 - 2
      main_cards[active_letter_index] = is_hidden ? '?' : active_letter.toUpperCase()
    }
    return `${main_cards.join('')} ${bonus_card}`
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
    const names = votes_int.map(num => this._players.find(p => p.num === num).name)
    return [true, `${player.name} believes [${names.join(', ')}] have proper words`]
  }

  format_for_board = (id) => {
    const len_names = this.get_max_char_of_names() + 4
    let ret = ''
    for (const [ii, player] of this._players.entries()) {
      const cards = this.format_player_cards(player, id === player.id)
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
      const votes = this._players.reduce((accum, p) => {
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
    const score = correct_words * this._players[0].length_of_words * 3 + bonus_letters * 1
    const score_chart = format_score_breakdown(this.num())

    return `_ _\n\nFinal Results\n\n\`\`\`Score: ${score}\n${ret}\`\`\`\n\nScore Chart:\n${score_chart}`
  }
}