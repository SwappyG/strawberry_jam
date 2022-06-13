import { make_ret } from "../utils/Return.js"

export class BonusCards {
  constructor() {
    this._cards = []
    this._users = []
    this._wild_user = false
  }

  add = (letter) => {
    this._cards.push(letter)
    this._users.push(false)
  }

  remove_by_index = (deck, index) => {
    if (index >= this._cards.length) {
      throw new Error('asked to remove bonus card great that number of cards')
    }
    deck.discard(this._cards[index])
    this._cards.splice(index, 1)
    this._users.splice(index, 1)
  }

  use = (index, discord_user) => {
    if (index > this._users.length) {
      return make_ret(false, `Tried to use bonus card ${7 + index}, but the highest bonus card index is ${7 + this._users.length}`)
    }
    if (this._users[index]) {
      return make_ret(false, `Bonus card \`< ${index} > [${this._users[index]}]\` is already in use by \`${this._users[index].username}\``)
    }
    this._users[index] = discord_user
    return make_ret(true, null, null, { letter: this._cards[index] })
  }

  unuse = (index) => {
    if (index > this._users.length) {
      throw new Error(`Tried to unuse bonus card out of bounds. index ${index} > ${this._users.length}`)
    }
    if (this._users[index] !== null) {
      throw new Error(`Tried to unuse card that was already not used, index ${index}`)
    }
    this._users[index] = null
    return make_ret(true, `Bonus card \`< ${index} > [${this._users[index]}]\` is no longer being used`)
  }

  use_wild = (discord_user) => {
    if (this._wild_user !== null) {
      return make_ret(false, `Wild card \`[*]\` is already in use by \`${this._wild_user.username}\``)
    }
    this._wild_user = discord_user
    return make_ret(true, `Wild card \`[*]\` is now being used`)
  }

  unuse_wild = () => {
    if (this._wild_user !== null) {
      throw new Error(`Tried to unuse wild card before it was used`)
    }
    this._wild_user = null
    return make_ret(true, `Wild card \`[*]\` is no longer being used`)
  }

  wild_user = () => {
    return this._wild_user
  }

  users = () => {
    return this._users
  }

  num = () => {
    return this._cards.length
  }

  get = (index) => {
    return [this._cards[index], this._users[index]]
  }

  getIndex = (letter) => {
    return this._cards.findIndex(c => c === letter)
  }

  update = (deck, hint_indices) => {
    const unique_bonus_cards_indices = [...new Set(hint_indices)].filter(h => h > 6)
    let consumed_letters = []
    for (const bonus_card_index of unique_bonus_cards_indices) {
      const ii = bonus_card_index - 7
      consumed_letters.push(this._cards[ii])
      this.remove_by_index(deck, ii)
    }
    return make_ret(true, null, null, { consumed_letters })
  }

  format_bonus_card_for_board = (ii, name_len) => {
    const index = `< ${7 + ii} >`
    const name = 'bonus'
    const name_spacer = `${' '.repeat(name_len - name.length)}`
    const card = `[${this._cards[ii].toUpperCase()}]`
    const is_used = `${this._users[ii] ? '/ IS_USED' : `/ IS_AVAIL`}`
    return `${index} ${name}${name_spacer}${card}    ${is_used}`
  }

  format_for_board = (name_len) => {
    let ret = ''
    for (const [ii, bonus_card] of this._cards.entries()) {
      ret = `${ret}\n${this.format_bonus_card_for_board(ii, name_len)}`
    }
    return ret
  }

  format_wildcard_for_board = (name_len) => {
    const index = `< 0 >`
    const name = 'wildcard'
    const name_spacer = `${' '.repeat(name_len - name.length)}`
    const card = `[*]`
    const is_used = `${this._wild_user ? '/ IS_USED' : `/ IS_AVAIL`}`
    return `${index} ${name}${name_spacer}${card}    ${is_used}`
  }
}