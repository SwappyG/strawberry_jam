

export class PublicPiles {
  constructor (deck, num_players, options) {
    this._piles = []
    if (num_players < 6) { this._piles.push(deck.draw_cards(7)) }
    if (num_players < 5) { this._piles.push(deck.draw_cards(8)) }
    if (num_players < 4) { this._piles.push(deck.draw_cards(9)) }
    if (num_players < 3) { this._piles.push(deck.draw_cards(10)) }
    if (options.allow_single_player) {
      if (num_players < 2) { this._piles.push(deck.draw_cards(11)) }
    }

    this._clues = Array(this._piles.length).fill(1)
  }

  top = (index, num_players) => {
    return this._piles[index - num_players - 1][0]
  }

  update = (deck, hint_indices, num_players) => {
    const unique_hint_indices = [...new Set(hint_indices)]
    let depleted_piles = []
    for (const hint_index of unique_hint_indices) {
      const ii = hint_index - num_players - 1 
      this._piles[ii].splice(0, 1)
      
      if (this._piles[ii].length === 0) {
        if (this._clues[ii]) {
          this._clues[ii] = 0
          depleted_piles.push(hint_index)
        } 
        this._piles[ii] = deck.draw_cards(1)
        console.log(this._piles[ii])
      }
    }
    return depleted_piles
  }

  formatted_pile_max_size = () => {
    return this._piles.reduce((prev, curr) => prev > curr.length ? prev : curr.length, 0) + 2
  }

  format_pile_for_board = (ii) => {
    return `[${this._piles[ii][0].toUpperCase()}]${']'.repeat(this._piles[ii].length - 1)}`
  }

  format_line_for_board = (ii, num_players, name_len, max_pile_size) => {
    const index = `< ${ii + num_players + 1} >`
    const name = `public`
    console.log(`name_len: ${name_len}, name.length: ${name.length}`)
    const name_spacer = `${' '.repeat(name_len - name.length)}`
    const pile = this.format_pile_for_board(ii)
    const pile_spacer = ' '.repeat((max_pile_size - pile.length) + 4) 
    const clue = this._clues[ii] ? `/ (!) /` : `/     /`
    return `${index} ${name}${name_spacer}${pile}${pile_spacer}${clue}` 
  }

  format_for_board = (num_players, name_len) => {
    const max_pile_size = this.formatted_pile_max_size()
    console.log(`max_pile_size: ${max_pile_size}`)
    let ret = ''
    for (const [ii, pile] of this._piles.entries()) {
      ret = `${ret}\n${this.format_line_for_board(ii, num_players, name_len, max_pile_size)}`
    }
    return ret
  }

}