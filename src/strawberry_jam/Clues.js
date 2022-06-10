export class Clues {
  constructor(num_players) {
    this._remaining = num_players <= 3 ? 8 : 10
    this._locked = num_players <= 3 ? 3 : 1

    switch (num_players) {
      case 1: this._req_hints_per_player = 6; break;
      case 2: this._req_hints_per_player = 3; break;
      case 3: this._req_hints_per_player = 2; break;
      default: this._req_hints_per_player = 1; break;
    }
  }

  increment = (amount = 1) => {
    this._remaining = this._remaining + amount
  }

  decrement = (amount = 1) => {
    this._remaining = Math.max(0, this._remaining - amount)
  }

  has_remaining = () => {
    return this._remaining > 0
  }

  update = (player_clue_counts) => {
    if (!player_clue_counts.every(p => p >= this._req_hints_per_player)) {
      return [false, `All players haven't given the minimum of \`${this._req_hints_per_player}\` clues`]
    }
    if (this._locked > 0) {
      this._remaining = this._remaining + this._locked
      this._locked = 0
      return [true, `Every player has given required min number of hints, extra clues have been unlocked!`]
    }
    return [true, `locked hints have already been unlocked`]
  }
}