export class BonusCards {
  constructor() {
    this._cards = []
    this._used = []
    this._wild_used = false
  }

  add = (letter) => {
    this._cards.push(letter)
    this._used.push(false)
  }

  remove_by_index = (deck, index) => {
    if (index >= this._cards.length) {
      throw new Error('asked to remove bonus card great that number of cards')
    }
    deck.discard(this._cards[index])
    this._cards.splice(index, 1)
    this._used.splice(index, 1)
  }

  use = (index) => {
    if (index > this._used.length) {
      return [false, `Tried to use bonus card out of bounds. index ${index} > ${this._used.length}`]
    }
    if (this._used[index]) {
      return [false, `Bonus card \`< ${index} > [${this._used[index]}]\` is already in use by another player`]
    }
    this._used[index] = true
    return [true, this._cards[index]]
  }

  unuse = (index) => {
    if (index > this._used.length) {
      throw new Error(`Tried to unuse bonus card out of bounds. index ${index} > ${this._used.length}`)
    }
    if (!this._used[index]) {
      throw new Error(`Tried to unuse card that was already not used, index ${index}`)
    }
    this._used[index] = false
    return [true, `Bonus card \`< ${index} > [${this._used[index]}]\` is no longer being used`]
  }

  use_wild = () => {
    if (this._wild_used) {
      return [false, `Wild card \`[*]\` is already in use by another player`]
    }
    this._wild_used = true
    return [true, `Wild card \`[*]\` is now being used`]
  }

  unuse_wild = () => {
    if (!this._wild_used) {
      throw new Error(`Tried to unuse wild card before it was used`)
    }
    this._wild_used = false
    return [true, `Wild card \`[*]\` is no longer being used`]
  }

  is_wild_used = () => {
    return this._wild_used
  }

  is_used = (index) => {
    return this._used[index]
  }

  num = () => {
    return this._cards.length
  }

  get = (index) => {
    return [this._cards[index], this._used[index]]
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
      this.remove_by_index(ii)
    }
    return [true, consumed_letters]
  }

  format_bonus_card_for_board = (ii, name_len) => {
    const index = `< ${7 + ii} >`
    const name = 'bonus'
    const name_spacer = `${' '.repeat(name_len - name.length)}`
    const card = `[${this._cards[ii].toUpperCase()}]`
    const is_used = `${this._used[ii] ? '/ IS_USED' : `/ IS_AVAIL`}`
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
    const is_used = `${this._wild_used ? '/ IS_USED' : `/ IS_AVAIL`}`
    return `${index} ${name}${name_spacer}${card}    ${is_used}`
  }
}