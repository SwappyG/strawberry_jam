const _FULL_DECK = [
  'a', 'a', 'a', 'a',
  'b', 'b',
  'c', 'c', 'c',
  'd', 'd', 'd',
  'e', 'e', 'e', 'e', 'e', 'e',
  'f', 'f',
  'g', 'g',
  'h', 'h', 'h',
  'i', 'i', 'i', 'i',
  'k', 'k',
  'l', 'l', 'l',
  'm', 'm',
  'n', 'n', 'n',
  'o', 'o', 'o', 'o',
  'p', 'p',
  'r', 'r', 'r', 'r',
  's', 's', 's', 's',
  't', 't', 't', 't',
  'u', 'u', 'u',
  'w', 'w',
  'y', 'y'
]

class Deck {
  constructor (cards = null) {
    this._cards = cards ?? _FULL_DECK.slice()
    this._discard = []
  }

  cards = () => {
    return this._cards
  }

  size = () => {
    return this._cards.length
  }

  copy = () => {
    console.log(this._cards)
    return new Deck(this._cards.slice())
  }

  discard = (cards) => {
    if (!Array.isArray(cards)) {
      cards = [cards]
    }
    this._discard.concat(cards)
  }

  return_cards = (cards) => {
    this._cards = this._cards.concat(cards.split(""))
  }

  draw_cards = (num) => {
    if (num > this._cards.length - 1) {
      this._cards = this._discard
      this._discard = []
    }
  
    let popped_cards = []
    for (let ii = 0; ii < num; ii++) {
      const index = Math.floor(Math.random()*this._cards.length)
      popped_cards.push(this._cards[index])
      this._cards.splice(index, 1)
    }
    return popped_cards
  } 

  draw_specific_cards = (cards, cards_to_return = null) => {
    if (cards_to_return) {
      this.return_cards(cards_to_return)
    }

    cards = cards.toLowerCase()
    let missing_letters = []
    for (const letter of cards) {
      const index = this._cards.findIndex(elem => letter === elem)
      if (index === -1) {
        missing_letters.push(letter)
      } else {
        this._cards.splice(index, 1)
      }
    }

    if (missing_letters.length > 0 && cards_to_return !== null) {
      this.draw_specific_cards(cards_to_return)
    }
    return missing_letters
  }
}

export {
  Deck
}