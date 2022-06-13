import { PLAYER_STATE } from "./PlayerState.js"
import { is_letters, shuffle_string } from "../utils/String.js"
import { array_last } from "../utils/ArrayUtils.js"

import { make_ret } from "../utils/Return.js"

export class Player {
  constructor({ discord_user, length_of_words }) {
    this.id = discord_user.id
    this.name = discord_user.username
    this.discord_user = discord_user
    this.num = null

    this.length_of_words = length_of_words
    this.word = null
    this.assigned_word = null
    this.assigned_word_unshuffled = null
    this.final_guess = null
    this.letter_index = null

    this.on_bonus_letter = false
    this.bonus_letter = null
    this.bonus_hint = null

    this.hints_given = 0
    this.hints_received = []
    for (let ii = 0; ii < this.length_of_words; ii++) {
      this.hints_received.push([])
    }

    this.guesses = Array(this.length_of_words).fill(null)
    this.votes = null

    this.state = PLAYER_STATE.CHOOSING_WORD
  }

  send = (text) => {
    console.log(this.discord_user)
    this.discord_user.send(text)
  }

  set_word_from_deck = (deck, word) => {
    if (!this.is_waiting_for_assigned_word() && !this.is_choosing_word()) {
      throw new Error(`The state machine has entered a weird PLAYER_STATE. A player is trying to set a word after game has started`)
    }
    console.log(`${word}, ${this.length_of_words}`)
    if (typeof word !== 'string' || !is_letters(word)) {
      return make_ret(false, `Your word should be made of letters only`)
    }

    if (word.length !== this.length_of_words) {
      return make_ret(false, `Your word should must be \`${this.length_of_words}\` characters long`)
    }

    let deck_copy = deck.copy()
    const missing_letters = deck_copy.draw_specific_cards(word, this.word)
    if (missing_letters.length > 0) {
      return make_ret(false, `The deck doesn't contain enough letters for your word. \`${missing_letters}\` are not available`)
    }

    this.word = word
    this.state = PLAYER_STATE.READY_TO_START
    return make_ret(true, null, null, { deck: deck_copy })
  }

  is_ready = () => {
    return this.state === PLAYER_STATE.READY
  }

  is_waiting_for_assigned_word = () => {
    return this.state === PLAYER_STATE.READY_TO_START
  }

  is_giving_hint = () => {
    return this.state === PLAYER_STATE.GIVING_HINT
  }

  is_choosing_word = () => {
    return this.state === PLAYER_STATE.CHOOSING_WORD
  }

  is_responding_to_hint = () => {
    return this.state === PLAYER_STATE.RESPONDING_TO_HINT
  }

  get_active_letter = () => {
    // console.log(this.assigned_word[this.letter_index])
    return this.on_bonus_letter ? this.bonus_letter : this.assigned_word[this.letter_index]
  }

  get_active_hint = () => {
    if (!this.is_responding_to_hint()) {
      return null
    }

    if (this.on_bonus_letter) {
      return this.bonus_hint
    } else {
      return array_last(this.hints_received[this.letter_index])
    }
  }

  assign_word = (word, player_num) => {
    if (!this.is_waiting_for_assigned_word()) {
      throw new Error(`The state machine has entered a weird PLAYER_STATE. A player is getting assigned a word before choosing one or after game has started`)
    }

    this.assigned_word_unshuffled = word.slice()
    this.assigned_word = shuffle_string(word.slice())
    this.letter_index = 0
    this.num = player_num
    this.state = PLAYER_STATE.READY
  }

  format_received_hints = () => {
    let hint_text = ``
    console.log(this.hints_received)
    for (const [letter_index, hints] of this.hints_received.entries()) {
      hint_text = `${hint_text}\n\nHints for Letter \`${letter_index + 1}\`:`
      for (const hint of hints) {
        hint_text = `${hint_text}\n - \`${hint.toUpperCase()}\``
      }
      hint_text = `${hint_text}\nYour guess: \`[${this.guesses[letter_index]}]\``
    }
    if (this.state === PLAYER_STATE.RESPONDING_TO_HINT) {
      hint_text = `${hint_text}\nThe latest hint is waiting for your response`
    }
    return hint_text
  }

  receive_hint = (hint) => {
    if (!this.is_ready()) {
      throw new Error(`The state machine has entered a weird PLAYER_STATE. A player is receiving a hint while not in READY state`)
    }
    this.state = PLAYER_STATE.RESPONDING_TO_HINT
    if (this.on_bonus_letter) {
      this.bonus_hint = hint
    } else {
      this.hints_received[this.letter_index].push(hint)
    }
  }

  give_hint = () => {
    if (this.state !== PLAYER_STATE.READY) {
      throw new Error(`The state machine has entered a weird PLAYER_STATE. A player is giving a hint while not in READY state`)
    }
    this.hints_given = this.hints_given + 1
    this.state = PLAYER_STATE.GIVING_HINT
  }

  advance_to_next_letter = (deck, guess_letter) => {
    if (!this.is_responding_to_hint()) {
      return make_ret(false, `You can't advance if you haven't been given a hint`)
    }

    if (this.on_bonus_letter) {
      return make_ret(false, `You have no remaining letters, guess your bonus letter instead`)
    }

    if (typeof guess_letter !== 'string' || guess_letter.length != 1 || !is_letters(guess_letter)) {
      return make_ret(false, `Your guess must be a single valid letter`)
    }
    this.guesses[this.letter_index] = guess_letter.toLowerCase()
    this.letter_index = this.letter_index + 1

    if (this.letter_index === this.length_of_words) {
      this.letter_index = null
      this.on_bonus_letter = true
      this.bonus_letter = deck.draw_cards(1)[0]
    }
    this.state = PLAYER_STATE.READY
    return make_ret(true, null, null, { on_bonus_letter: this.on_bonus_letter })
  }

  pass = () => {
    if (!this.is_responding_to_hint()) {
      return make_ret(false, `Either the hint didn't include you, or you already replied to it`)
    }

    if (this.on_bonus_letter) {
      return make_ret(false, `You can't pass when you have no letters left, guess your bonus letter instead`)
    }
    this.state = PLAYER_STATE.READY
    return make_ret(true)
  }

  round_complete = () => {
    if (this.is_responding_to_hint()) {
      throw new Error(`The state machine has entered a weird PLAYER_STATE. The round has ended before ${this.name} responded to their hint`)
    }
    this.state = PLAYER_STATE.READY
  }

  guess_bonus = (deck, letter) => {
    if (!this.is_responding_to_hint()) {
      return make_ret(false, `Either the hint didn't include you, or you already replied to it`)
    }

    if (!this.on_bonus_letter) {
      return make_ret(false, `You are not on your bonus letters, pass or advance instead`)
    }

    if ((typeof letter !== 'string') || (letter.length != 1) || (!is_letters(letter))) {
      return make_ret(false, `Your bonus letter guess must be a single valid letter`)
    }

    // regardless of correct guess or not, we change bonus letters
    const prev_bonus_letter = this.bonus_letter
    deck.discard(this.bonus_letter)
    this.bonus_letter = deck.draw_cards(1)[0]
    this.bonus_hint = null

    this.state = PLAYER_STATE.READY

    return make_ret(true, null, null, { correct: letter.toLowerCase() === prev_bonus_letter })
  }

  make_final_guess = (indices_str, bonus_cards) => {
    if (!this.is_ready()) {
      throw new Error(`The state machine has entered a weird PLAYER_STATE. ${this.name} tried to make a final guess while not READY`)
    }

    const entries = indices_str.toString().split(',')
    if (entries.length < this.length_of_words) {
      return make_ret(false, `Your guess must be at equal to or larger than your assigned word, (ie, \`${this.length_of_words}\` letters or more)`)
    }

    if (entries.length !== [...new Set(entries)].length) {
      return make_ret(false, `You can't have duplicate indices when reshuffling your final guess`)
    }

    const non_bonus_indices = entries.filter(e => e[0] !== 'b')
    if (entries.includes(0) && (non_bonus_indices.length === this.length_of_words)) {
      return make_ret(false, `If you use a wild card \`[*]\`, then it must *replace* one of your original letters`)
    }

    let guess = []
    let bonus_cards_used = []
    let wild_used = false

    for (let entry of entries) {
      const is_bonus_index = entry[0].toLowerCase() === 'b'
      const index = parseInt(is_bonus_index ? entry.slice(1) : entry)
      if (isNaN(index)) {
        return make_ret(false, `Your indices must be integers`)
      }
      if (index < 0) {
        return make_ret(false, `Your indices cannot be negative`)
      }
      if (!is_bonus_index && (index > this.length_of_words)) {
        return make_ret(false, `Your non-bonus indices cannot be greater than the number of letters you were assigned`)
      }

      if (index === 0) {
        const { success, reply_msg, dm_msg, ...rest } = bonus_cards.use_wild()
        if (!success) {
          return { success, reply_msg }
        }
        guess.push('*')
        wild_used = true
      } else if (is_bonus_index) {
        const { success, reply_msg, dm_msg, ...rest } = bonus_cards.use(index - 7)
        if (!success) {
          return { success, reply_msg }
        }
        guess.push(rest.letter)
        bonus_cards_used.push(rest.letter)
      } else {
        guess.push(this.assigned_word[index - 1])
      }
    }
    this.final_guess = guess.join('')
    return make_ret(true, null, null, { wild_used, bonus_cards_used })
  }

  format_cards = (is_hidden = false) => {
    console.log(`is_hidden: ${is_hidden}`)
    const word_len = this.assigned_word.length

    let main_cards = ('[ ]'.repeat(word_len)).split('')
    let bonus_card = `/    `
    if (this.on_bonus_letter) {
      bonus_card = is_hidden ? '/ [?]' : `/ [${this.bonus_letter.toUpperCase()}]`
    } else {
      const active_letter = this.assigned_word[this.letter_index]
      const active_letter_index = (this.letter_index + 1) * 3 - 2
      main_cards[active_letter_index] = is_hidden ? '?' : active_letter.toUpperCase()
    }
    return `${main_cards.join('')} ${bonus_card}`
  }
}