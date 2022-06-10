import { Mutex } from 'async-mutex'

import { STATE } from './State.js'

import { Deck } from './Deck.js';
import { Players } from './Players.js';
import { BonusCards } from './BonusCards.js'
import { PublicPiles } from './PublicPiles.js';
import { Clues } from './Clues.js';

import { format_hint, format_board } from './FormatOutput.js'
import { get_help_string } from './Help.js';
import { char_array_to_int_array } from '../utils/String.js';

export const make_strawberry_jam = (game_id, args, callbacks) => {
  if (!args.word_length && !args.w) {
    return [false, `Missing required arg \`--word_length\` or \`--w\``]
  }

  const length_of_words = parseInt(args?.word_length ?? args?.w)
  if (isNaN(length_of_words) || length_of_words < 4 || length_of_words > 7) {
    return [false, `Player words must be between 4 and 7, try again`]
  }

  if ([callbacks.reply, callbacks.msg_everyone, callbacks.msg_user].includes(undefined)) {
    return [false, `Internal Error: Missing callbacks`]
  }

  const options = {
    'length_of_words': length_of_words,
    'allow_single_player': args?.allow_single_player ?? false,
    'max_players': args?.max_players ?? 6
  }

  return [true, new StrawberryJam(game_id, options, callbacks)]
}

export class StrawberryJam {
  constructor(game_id, options, callbacks) {
    this.options = options
    this.id = game_id

    this._reply = callbacks.reply
    this._msg_everyone = callbacks.msg_everyone
    this._msg_user = callbacks.msg_user
    this._prefix = callbacks.prefix()

    this._mutex = new Mutex()

    this._reset()
  }

  get_commands = () => {
    return [
      [["help", "h"], this._help],
      [["lobby", "l"], this._view_lobby],
      [["word", "w"], this._set_word],
      [["start", "s"], this._start_game],
      [["end", "e"], this._end_game],
      [["board", "b"], this._show_board],
      [["clue", "c"], this._give_clue],
      [["view", "v"], this._view_hints],
      [["pass", "p"], this._pass],
      [["advance", "a"], this._advance],
      [["guess", "g"], this._guess_letter],
      [["final", "f"], this._final_guess],
      [["results", "r"], this._show_results],
      [["vote", "V"], this._vote_for_score],
      [["_debug", "_d"], this._debug],
    ]
  }

  format_for_lobby = async (detailed = false) => {
    return this._mutex.runExclusive(() => {
      const summary = `StrawberryJam / ${this.options.length_of_words} Letters / (${this._players.num()}/${this.options.max_players}) players / ${this._state}`
      if (!detailed) {
        return summary
      }
      let ret = `${summary}`
      for (const p of this._players.players()) {
        ret = `${ret}\n - ${p.name} / ${p.state}`
      }
      ret = ret + '\n'
      for (const [k, v] of Object.entries(this.options)) {
        ret = `${ret}\n${k}: ${v}`
      }
      return `\`\`\`${ret}\`\`\``
    })
  }

  get_num_players = async () => {
    return this._mutex.runExclusive(() => {
      return this._players.num()
    })
  }

  get_player_names = async () => {
    return this._mutex.runExclusive(() => {
      return this._players.get_player_names()
    })
  }

  join = async (user_id, user_name) => {
    return this._mutex.runExclusive(() => {
      if (this._state !== STATE.CREATING_GAME) {
        return [false, `The game has already started, you are no longer able to join`]
      }

      return this._players.add_player({
        discord_id: user_id,
        name: user_name,
        length_of_words: this.options.length_of_words
      })
    })
  }

  exit = async (user_id) => {
    return this._mutex.runExclusive(() => {
      if (this._state !== STATE.CREATING_GAME) {
        return [false, `Cannot leave before game exists or after its already running`]
      }

      return this._players.remove_player(user_id)
    })
  }

  _reset = () => {
    this._deck = new Deck()
    this._state = STATE.CREATING_GAME
    this._players = new Players()
    this._public_piles = null
    this._bonus_cards = new BonusCards()
    this._clues = null
  }

  _removed_used_bonus_cards = (bonus_cards, hint_indices) => {
    const unique_hint_indices = [...new Set(hint_indices)]
    for (const index of unique_hint_indices) {
      if (index < 7) {
        continue
      }
      const bonus_cards_index = index - 7
      const letter = bonus_cards[bonus_cards_index]
      bonus_cards.splice(bonus_cards_index, 1)
      this._msg_everyone(`Bonus card ${letter} was consumed`)
    }
    return bonus_cards
  }

  _parse_hint_indices = (hint, player_index) => {
    const indices_chars = hint.toString().split(',')

    const indices = char_array_to_int_array(indices_chars)
    if (indices === null) {
      return [false, `Indices list could not be parsed to integers`]
    }

    if (indices.some(ii => ii < 0 || ii > 6 + this._bonus_cards.num())) {
      return [false, `Indices list contains numbers less than \`0\` or greater than piles in board (\`${6 + this._bonus_cards.num()}\`)`]
    }

    if (indices.includes(player_index)) {
      return [false, `You can't give a hint that includes your own letter`]
    }

    console.log(indices_chars)
    console.log(indices)
    return [true, indices]
  }

  _format_board = (messenger_id, help = false) => {
    return format_board(this._players, this._public_piles, this._bonus_cards, this._clues, messenger_id, help)
  }

  _view_lobby = async (msg, args) => {
    return this._mutex.runExclusive(() => {
      if (this._state === STATE.IDLE) {
        return this._reply(msg, `Cannot show lobby while game doesn't exist`)
      }

      this._reply(msg, this._players.format_player_states())
    })
  }

  _set_word = async (msg, args) => {
    return this._mutex.runExclusive(() => {
      if (this._state !== STATE.CREATING_GAME) {
        return this._reply(msg, `Cannot set word before game exists or after its already running`)
      }

      if (msg.channel.type !== 'dm') {
        return this._reply(msg, `Your secret word must be a DM! Choose a new word and DM it instead`)
      }

      if (args["_"].length < 2) {
        return this._reply(msg, `You need to specify your word. Call help for syntax.`)
      }

      const word = args["_"][1]
      const [success, ...ret] = this._players.apply_to_player(msg.author.id, (player) => {
        return player.set_word_from_deck(this._deck, word)
      })
      if (!success) {
        return this._reply(msg, ret[0])
      }

      this._deck = ret[0]
      this._msg_user(msg.author.id, ret[1])
    })
  }

  _start_game = async (msg, args) => {
    return this._mutex.runExclusive(() => {
      if (this._state !== STATE.CREATING_GAME) {
        return this._reply(msg, `Cannot start a game before it's been created or while one is running`)
      }

      const [success, ...ret] = this._players.assign_word_to_all_players(msg.author.id, this.options)
      if (!success) {
        return this._reply(msg, ret[0])
      }
      this._msg_everyone(ret[0])

      this._public_piles = new PublicPiles(this._deck, this._players.num(), this.options)
      this._clues = new Clues(this._players.num())
      this._state = STATE.WAITING_FOR_HINT

      for (const player of this._players.players()) {
        this._msg_user(player.id, this._format_board(player.id))
      }
    })
  }

  _end_game = async (msg, args) => {
    await this._mutex.runExclusive(() => {
      this._msg_everyone(`${msg.author.username} has ended the game`)
      this._reset()
    })
  }

  _show_board = async (msg, args) => {
    return this._mutex.runExclusive(() => {
      if (![STATE.WAITING_FOR_HINT, STATE.DURING_HINT, STATE.FINAL_GUESS, STATE.SHOWING_RESULTS].includes(this._state)) {
        return this._reply(msg, `There is either no game, or it's still being created`)
      }

      this._msg_user(msg.author.id, this._format_board(msg.author.id, args.help))
    })
  }

  _give_clue = async (msg, args) => {
    return this._mutex.runExclusive(() => {
      if (this._state !== STATE.WAITING_FOR_HINT) {
        return this._reply(msg, `Cannot give a hint, either game hasn't started or another hint is in progress`)
      }

      if (args["_"].length < 2) {
        return this._reply(msg, `You need to specify your hint. Call help for syntax.`)
      }
      const hint = args["_"][1]

      const [success, ...ret] = this._players.apply_to_player(msg.author.id, (player) => {
        const [success, ...ret] = this._parse_hint_indices(hint, player.num)
        if (success) { player.give_hint() }
        return [success, ...ret]
      })
      if (!success) {
        return this._reply(msg, ret[0])
      }
      this._active_hint_indices = ret[0]

      for (const player of this._players.players()) {
        let ret = format_hint(player, this._players, this._public_piles, this._bonus_cards, this._active_hint_indices)
        if (player.id === msg.author.id) {
          this._reply(msg, `you just sent the hint: \`${ret}\``, true)
        } else if (this._active_hint_indices.includes(player.num)) {
          this._msg_user(player.id, `_ _\n\n${msg.author.username} sent you a new hint: \`${ret}\`\n`)
          player.receive_hint(ret)
        } else {
          this._msg_user(player.id, `_ _\n\n${msg.author.username} sent a hint, but you're not part of it: \`${ret}\`\n`)
        }
        this._msg_user(player.id, this._format_board(player.id))
      }
      this._clues.decrement()
      this._state = STATE.DURING_HINT

      if (this._players.all_players_done_responding_to_hint()) {
        this._end_round()
      }
    })
  }

  _view_hints = async (msg, args) => {
    return this._mutex.runExclusive(() => {
      if (![STATE.WAITING_FOR_HINT, STATE.DURING_HINT, STATE.FINAL_GUESS, STATE.SHOWING_RESULTS].includes(this._state)) {
        return this._reply(msg, `There is no active game`)
      }

      const [success, ...ret] = this._players.apply_to_player(msg.author.id, (player) => {
        return [true, player.format_received_hints()]
      })
      if (!success) {
        this._reply(msg, ret[0])
      }
      this._msg_user(msg.author.id, `_ _\n\nYou've received the following hints.${ret[0]}`)
    })
  }

  _end_round = () => {
    const depleted_piles = this._public_piles.update(
      this._deck, this._active_hint_indices, this._players.num())
    for (const p of depleted_piles) {
      this._clues.increment()
      this._msg_everyone(`Pile \`< ${p} >\` has been depleted, a new clue token was unlocked`)
    }
    this._bonus_cards.update(this._active_hint_indices)
    this._clues.update(this._players.get_player_clues_given())
    this._players.end_round()

    this._active_hint_indices = []

    this._msg_everyone(`The current hint is over. Anyone can now give the next hint`)
    for (const p of this._players.players()) {
      this._msg_user(p.id, this._format_board(p.id))
    }
    if (!this._clues.has_remaining()) {
      this._msg_everyone(`There are no more hints remaining. Everyone should now guess their word`)
      this._state = STATE.FINAL_GUESS
    } else {
      this._state = STATE.WAITING_FOR_HINT
    }
  }

  _advance = async (msg, args) => {
    return this._mutex.runExclusive(() => {
      if (this._state !== STATE.DURING_HINT) {
        return this._reply(msg, `Cannot end hint while no hint is in progress`)
      }

      if (args["_"].length < 2) {
        return this._reply(msg, `You need to enter a character for your guess for this index. Call help for syntax.`)
      }

      const letter = args["_"][1]
      const [success, ...ret] = this._players.apply_to_player(msg.author.id, (player) => {
        return player.advance_to_next_letter(this._deck, letter)
      })
      if (!success) {
        return this._reply(msg, ret[0])
      }

      this._msg_everyone(ret[0])
      if (ret[1].length > 0) {
        this._reply(msg, ret[1])
      }

      this._msg_user(msg.author.id, this._format_board(msg.author.id))
      if (this._players.all_players_done_responding_to_hint()) {
        this._end_round()
      }
    })
  }

  _pass = async (msg, args) => {
    return this._mutex.runExclusive(() => {
      if (this._state !== STATE.DURING_HINT) {
        return this._reply(msg, `Cannot pass while no hint is in progress`)
      }

      const [success, ...ret] = this._players.apply_to_player(msg.author.id, (player) => {
        return player.pass()
      })
      if (!success) {
        return this._reply(msg, ret[0])
      }

      this._msg_everyone(ret[0])
      this._msg_user(msg.author.id, this._format_board(msg.author.id))
      if (this._players.all_players_done_responding_to_hint()) {
        this._end_round()
      }
    })
  }

  _guess_letter = async (msg, args) => {
    return this._mutex.runExclusive(() => {
      if (this._state !== STATE.DURING_HINT) {
        return this._reply(msg, `Cannot guess bonus letter when no hint is in progress`)
      }

      if (args["_"].length < 2) {
        return this._reply(msg, `You need to specify the letter to guess`)
      }
      const letter = args["_"][1]

      const [success, ...ret] = this._players.apply_to_player(msg.author.id, (player) => {
        return player.guess_bonus(this._deck, letter)
      })
      if (!success) {
        return this._reply(msg, ret[0])
      }

      this._msg_everyone(ret[1])
      if (ret[0]) {
        this._bonus_cards.add(letter.toLowerCase())
      }

      this._msg_user(msg.author.id, this._format_board(msg.author.id))
      if (this._players.all_players_done_responding_to_hint()) {
        this._end_round()
      }
    })
  }

  _final_guess = async (msg, args) => {
    return this._mutex.runExclusive(() => {
      if (this._state !== STATE.FINAL_GUESS) {
        return this._reply(msg, `Can't make final guess until all clues have been used`)
      }

      if (args["_"].length < 2) {
        return this._reply(msg, `You need to specify the indices for your final guess. Call help for syntax.`)
      }
      const indices = args["_"][1]
      const [success, ...ret] = this._players.apply_to_player(msg.author.id, (player) => {
        return player.make_final_guess(indices, this._bonus_cards)
      })
      if (!success) {
        return this._reply(msg, ret[0])
      }

      if (ret[0]) {
        this._msg_everyone(`${msg.author.username} just used the wild card \`[*]\` in their final guess`)
      }
      for (const letter of ret[1]) {
        this._msg_everyone(`${msg.author.username} just used the bonus letter \`[${letter}]\` in their final guess`)
      }
      this._msg_everyone(ret[2])
      this._msg_user(msg.author.id, this._format_board(msg.author.id))

      if (this._players.all_players_have_final_guess()) {
        this._state = STATE.SHOWING_RESULTS
        this._msg_everyone(`All players made their final guess. Showing results`)
        this._msg_everyone(this._players.format_results())
        this._msg_everyone(`You can now vote for which words you think are spelled correctly`)
      }
    })
  }

  _show_results = async (msg, args) => {
    return this._mutex.runExclusive(() => {
      if (this._state !== STATE.SHOWING_RESULTS) {
        return this._reply(msg, `Can't results until end of game`)
      }

      return this._reply(msg, this._players.format_results())
    })
  }

  _vote_for_score = async (msg, args) => {
    return this._mutex.runExclusive(() => {
      if (this._state !== STATE.SHOWING_RESULTS) {
        return this._reply(msg, `Can't vote for score until the end of the game`)
      }

      if (args["_"].length < 2) {
        return this._reply(msg, `You need to specify the player indices for your vote. Call help for syntax.`)
      }
      const votes = args["_"][1]
      const [success, ...ret] = this._players.add_votes(msg.author.id, votes)
      if (!success) {
        return this._reply(msg, ret[0])
      }
      this._msg_everyone(ret[0])
      this._msg_everyone(this._players.format_results())
    })
  }

  _help = async (msg, args) => {
    return this._mutex.runExclusive(() => {
      const help_str = get_help_string(this._state, this._prefix, this._players.get_player(msg.author.id))
      this._reply(msg, help_str)
    })
  }

  _debug = async (msg, args) => {
    return this._mutex.runExclusive(() => {
      if (args.end_round) {
        if (this._state !== STATE.DURING_HINT) {
          return this._reply(msg, `can't end a round that doesn't exist`)
        }

        return this._end_round()
      }
      if (args.state) {
        this._reply(msg, `\`\`\`State: ${this._state}\`\`\``)
      }

      if (args.add_hints) {
        this._clues.increment(parseInt(args.add_hints))
        this._reply(msg, `Added ${args.add_hints} clue to "remaining clues" pile`)
      }

      if (args.shuffle_deck) {
        this._deck._cards.concat(this._deck._discard)
        this._reply(msg, `Shuffled discard pile into deck.\n\`\`\`${JSON.stringify(this._deck, null, 2)}\`\`\``)
      }

      if (args.discard_cards) {
        this._deck.discard(this._deck.draw_cards(parseInt(args.discard_cards)))
        this._reply(msg, `Discarded ${args.discard_cards} cards from the deck`)
      }

      if (args.deck) {
        this._reply(msg, `\`\`\`${JSON.stringify(this._deck)}\`\`\``)
      }

      if (args.players) {
        for (const p of this._players.players()) {
          this._reply(msg, `\`\`\`${JSON.stringify(p, null, 2)}\`\`\``)
        }
      }

      if (args.everything) {
        this._reply(msg, `\`\`\`${JSON.stringify(this, null, 2)}\`\`\``)
      }

      if (args.public) {
        this._reply(msg, `\`\`\`${JSON.stringify(this._public_piles, null, 2)}\`\`\``)
      }

      if (args.options) {
        this._reply(msg, `\`\`\`${JSON.stringify(this.options, null, 2)}\`\`\``)
      }

      if (args.clues) {
        this._reply(msg, `\`\`\`${JSON.stringify(this._clues, null, 2)}\`\`\``)
      }

      if (args.bonus) {
        this._reply(msg, `\`\`\`${JSON.stringify(this._bonus_cards, null, 2)}\`\`\``)
      }

      if (args.consume_hints) {
        this._clues.decrement(parseInt(args.consume_hints))
      }

      if (args.add_bonus) {
        this._bonus_cards.add(this._deck.draw_cards(1)[0])
      }

      if (args.remove_bonus) {
        const ii = parseInt(args.remove_bonus)
        if (!isNaN(ii) && (ii > 6) && ((ii - 7) < this._bonus_cards.length)) {
          this._bonus_cards.remove_by_index(this._deck, ii)
        } else {
          this._reply(msg, `Index for bonus cards is too large`)
        }
      }

      if (args.unlock_clues) {
        this._clues._remaining = this._clues._remaining + this._clues._locked
        this._clues._locked = 0
        this._reply(msg, `Force unlocked clues`)
      }
    })
  }
}