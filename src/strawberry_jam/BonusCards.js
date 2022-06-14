import { make_ret } from "../utils/Return.js"

export class BonusCards {
  constructor() {
    this._cards = []
    this._users = []
    this._wild_user = null
  }

  _unuse_by_user = (discord_user) => {
    let indices = []
    for (const [ii, user] of this._users.entries()) {
      if (user?.id === discord_user.id) {
        indices.push(ii)
        this._users[ii] = null
      }
    }
    const using_wild = this._wild_user?.id === discord_user.id
    if (using_wild) {
      this._wild_user = null
    }

    return {
      bonus_card_indicies: indices,
      using_wild: using_wild
    }
  }

  add = (letter) => {
    this._cards.push(letter)
    this._users.push(null)
  }

  remove_by_index = (deck, index) => {
    if (index < 0 || index >= this._cards.length) {
      throw new Error(`BonusCards.remove_by_index : index [${index}]out of bounds`)
    }
    deck.discard(this._cards[index])
    this._cards.splice(index, 1)
    this._users.splice(index, 1)
  }

  assign_to_user = (indices, wild, discord_user) => {
    const used_by_user_before = this._unuse_by_user(discord_user)

    const reuse_if_failed = () => {
      for (const index of used_by_user_before.bonus_card_indicies) {
        this._users[index] = discord_user
      }
      if (used_by_user_before.using_wild) {
        this._wild_user = discord_user
      }
    }

    if (indices.some(ii => ii < 0 || ii > this._users.length - 1)) {
      return make_ret(false, `BonusCards.assign_to_user - indices out of bounds`)
    }

    const used_indices = indices.filter(ii => this._users[ii] !== null)
    if (used_indices.length > 0) {
      reuse_if_failed()
      return make_ret(false, `Bonus cards [${used_indices.map(ii => ii + 7)}] are in use by other players`)
    }

    if (wild && this._wild_user !== null) {
      reuse_if_failed()
      return make_ret(false, `Wild Card [*] is already in use`)
    }

    if (wild) {
      this._wild_user = discord_user
    }

    indices.forEach(ii => this._users[ii] = discord_user)
    return make_ret(true)
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
    if (index > this._cards.length - 1) {
      throw new Error(`BonusCard.get called with index ${index} > cards avail [${this._cards.length - 1}]`)
    }
    return { card: this._cards[index], user: this._users[index] }
  }

  update = (deck, hint_indices) => {
    const unique_bonus_cards_indices = ([...new Set(hint_indices)].filter(h => h > 6)).map(ii => ii - 7)

    if (unique_bonus_cards_indices.some(ii => ii < 0 || ii > this.num() - 1)) {
      throw new Error(`BonusCards.update - received hint indices exceeding bonus card index`)
    }

    let consumed_letters = []
    for (const ii of unique_bonus_cards_indices) {
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