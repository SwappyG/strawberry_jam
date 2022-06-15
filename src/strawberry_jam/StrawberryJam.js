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
import { make_ret } from '../utils/Return.js';

export const make_strawberry_jam = (game_id, args, prefix) => {
  if (args.help) {
    const word_len_msg = `- \`--word_length <length>\` or \`--w <length>\`, how long each player's word will be`
    const max_players_msg = `- \`--max_players <num>\` how many players allowed in lobby, between 2 and 6`
    return make_ret(false, `_ _\n\nRequired args:\n${word_len_msg}\n\nOptional args:\n${max_players_msg}`)
  }

  if (!args.word_length && !args.w) {
    return make_ret(false, `Missing required arg \`--word_length\` or \`--w\``)
  }

  const length_of_words = parseInt(args?.word_length ?? args?.w)
  if (isNaN(length_of_words) || length_of_words < 4 || length_of_words > 7) {
    return make_ret(false, `Player words must be between 4 and 7, try again`)
  }

  const options = {
    'length_of_words': length_of_words,
    'max_players': Math.min(6, Math.max(2, args?.max_players ?? 6)),
    'allow_single_player': args?.allow_single_player ?? false,
  }

  return make_ret(true, null, null, { game: new StrawberryJam(game_id, options, prefix) })
}

const notify_if_not_dm = (args) => {
  return args.is_dm ? null : `The result of your request has been DM'ed to you`
}

export class StrawberryJam {
  constructor(game_id, options, prefix) {
    this.options = options
    this.id = game_id
    this._prefix = prefix

    this._mutex = new Mutex()

    this._reset()
  }

  get_commands = () => {
    const commands = [
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

    return commands.reduce((accum, [cmds, func]) => {
      cmds.forEach(cmd => { accum[cmd] = func })
      return accum
    }, {})
  }

  join = async (discord_user) => {
    return await this._mutex.runExclusive(async () => {
      if (this._state !== STATE.CREATING_GAME) {
        return make_ret(false, `The game has already started, you are no longer able to join`)
      }

      const { success, reply_msg, dm_msg, ...rest } = this._players.add_player({
        discord_user, length_of_words: this.options.length_of_words
      })
      if (!success) {
        return { success, reply_msg }
      }

      this._players.msg_everyone(`\`${discord_user.username}\` has joined the game`)
      return make_ret(true)
    })
  }

  exit = async (discord_user) => {
    return await this._mutex.runExclusive(async () => {
      if (this._state !== STATE.CREATING_GAME) {
        return make_ret(false, `Cannot leave before game exists or after its already running`)
      }

      const { success, reply_msg, dm_msg, ...rest } = this._players.remove_player(discord_user)
      if (!success) {
        return { success, reply_msg }
      }

      this._players.msg_everyone(`\`${discord_user.username}\` has left the game`)
      return make_ret(true)
    })
  }

  help = async (player_id) => {
    return await this._mutex.runExclusive(async () => {
      return get_help_string(this._state, this._prefix, this._players.get_player(player_id))
    })
  }

  game_state = () => {
    return {
      id: this.id,
      options: this.options,
      state: this._state,
      num_players: this._players.num(),
      bonus_cards: this._bonus_cards._cards,
      remaining_clues: this._clues.remaining(),
      locked_clues: this._clues.locked(),
      public_clues: this._public_piles._clues,
      public_pile_num_cards: this._public_piles._piles.map(pile => pile.length),
      public_top_cards: this._public_piles._piles.map(pile => pile[0]),
      player_states: [...this._players._players].map(([id, player]) => player.state),
      player_active_letters: [...this._players._players].map(([id, player]) => player.get_active_letter()),
      player_votes: [...this._players._players].map(([id, player]) => player.votes)
    }
  }

  format_for_lobby = async (detailed = false) => {
    return await this._mutex.runExclusive(async () => {
      const summary = `StrawberryJam / ${this.options.length_of_words} Letters / (${this._players.num()}/${this.options.max_players}) players / ${this._state}`
      if (!detailed) {
        return summary
      }
      let ret = `${summary}`
      for (const [id, p] of this._players.get()) {
        ret = `${ret}\n - ${p.name} / ${p.state}`
      }
      ret = ret + '\n'
      for (const [k, v] of Object.entries(this.options)) {
        ret = `${ret}\n${k}: ${v}`
      }
      return `\`\`\`${ret}\`\`\``
    })
  }

  msg_everyone = (text) => {
    this._players.msg_everyone(text)
  }

  get_users = async () => {
    return await this._mutex.runExclusive(async () => {
      return [...this._players._players].map(([id, player]) => player.discord_user)
    })
  }

  _reset = () => {
    this._deck = new Deck()
    this._state = STATE.CREATING_GAME
    this._players = new Players(this.options.max_players)
    this._public_piles = null
    this._bonus_cards = new BonusCards()
    this._clues = null
  }

  _parse_hint_indices = (hint, player_index) => {
    const indices_chars = hint.toString().split(',')

    const indices = char_array_to_int_array(indices_chars)
    if (indices === null) {
      return make_ret(false, `Indices list could not be parsed to integers`)
    }

    if (indices.some(ii => ii < 0 || ii > 6 + this._bonus_cards.num())) {
      return make_ret(false, `Indices list contains numbers less than \`0\` or greater than piles in board (\`${6 + this._bonus_cards.num()}\`)`)
    }

    if (indices.includes(player_index)) {
      return make_ret(false, `You can't give a hint that includes your own letter`)
    }

    return make_ret(true, null, null, { indices })
  }

  _view_lobby = async ({ discord_user, args }) => {
    return await this._mutex.runExclusive(async () => {
      return make_ret(true, this._players.format_player_states())
    })
  }

  _set_word = async ({ discord_user, args }) => {
    return await this._mutex.runExclusive(async () => {
      if (this._state !== STATE.CREATING_GAME) {
        return make_ret(false, `Cannot set word after game has already started`)
      }

      if (!args.is_dm) {
        return make_ret(false, `Your secret word must be a DM! Choose a new word and DM it instead`)
      }

      if (args["_"].length < 2) {
        return make_ret(false, `You need to specify your word`)
      }

      const word = args["_"][1]
      const { success, reply_msg, dm_msg, ...rest } = this._players.apply_to_player(discord_user, (player) => {
        return player.set_word_from_deck(this._deck, word)
      })
      if (!success) {
        return { success, reply_msg }
      }

      this._deck = rest.deck
      return make_ret(true, `Your word has been set to \`${word.toUpperCase()}\``)
    })
  }

  _start_game = async ({ discord_user, args }) => {
    return await this._mutex.runExclusive(async () => {
      if (this._state !== STATE.CREATING_GAME) {
        return make_ret(false, `The game is already running`)
      }

      const { success, reply_msg, dm_msg, ...rest } = this._players.assign_word_to_all_players(discord_user, this.options)
      if (!success) {
        return { success, reply_msg }
      }

      this._players.msg_everyone(`All players have been assigned their word. The game has been started`)
      this._public_piles = new PublicPiles(this._deck, this._players.num(), this.options)
      this._clues = new Clues(this._players.num())
      this._state = STATE.WAITING_FOR_HINT
      this._send_board_to_everyone()
      return make_ret(true, `You've started the game`)
    })
  }

  _end_game = async ({ discord_user, args }) => {
    return await this._mutex.runExclusive(async () => {
      this._players.msg_everyone(`\`${discord_user.username}\` has ended the game`)
      this._reset()
      return make_ret(true, `You've ended the game`)
    })
  }

  _show_board = async ({ discord_user, args }) => {
    return await this._mutex.runExclusive(async () => {
      if (this._state === STATE.CREATING_GAME) {
        return make_ret(false, `Cannot show the board before the game has started`)
      }

      discord_user.send(this._format_board(discord_user.id, args.help))
      return make_ret(true, notify_if_not_dm(args))
    })
  }

  _give_clue = async ({ discord_user, args }) => {
    return await this._mutex.runExclusive(async () => {
      if (this._state !== STATE.WAITING_FOR_HINT) {
        return make_ret(false, `Cannot give a hint, either game hasn't started or another hint is in progress`)
      }

      const hint_giving_player = this._players.get_player(discord_user.id)
      if (hint_giving_player === null) {
        return make_ret(false, `You can't give a clue if you're not in the game`)
      }

      if (args["_"].length < 2) {
        return make_ret(false, `You need to specify your hint. Call help for syntax.`)
      }
      const hint = args["_"][1]

      const { success, reply_msg, dm_msg, ...rest } = this._parse_hint_indices(hint, hint_giving_player.num)
      if (!success) {
        return { success, reply_msg }
      }

      hint_giving_player.give_hint()
      this._active_hint_indices = rest.indices

      for (const [id, player] of this._players.get()) {
        let ret = format_hint(player, this._players, this._public_piles, this._bonus_cards, this._active_hint_indices)
        if (player.id === discord_user.id) {
          player.send(`you just sent the hint: \`${ret}\``)
        } else if (this._active_hint_indices.includes(player.num)) {
          player.send(`_ _\n\n\`${discord_user.username}\` sent you a new hint: \`${ret}\`\n`)
          player.receive_hint(ret)
        } else {
          player.send(`_ _\n\n\`${discord_user.username}\` sent a hint, but you're not part of it: \`${ret}\`\n`)
        }
      }

      this._clues.decrement()
      this._state = STATE.DURING_HINT
      this._send_board_to_everyone()

      if (this._players.all_players_done_responded_to_hint()) {
        this._end_round()
      }

      return make_ret(true, `Your hint has been sent to everyone`)
    })
  }

  _view_hints = async ({ discord_user, args }) => {
    return await this._mutex.runExclusive(async () => {
      if (this._state === STATE.CREATING_GAME) {
        return make_ret(false, `Can't view your hints before the game starts`)
      }

      const player = this._players.get_player(discord_user.id)
      if (player === null) {
        return (false, `You can't give a clue if you're not in the game`)
      }

      discord_user.send(`_ _\n\nYou've received the following hints.${player.format_received_hints()}`)
      return make_ret(true, notify_if_not_dm(args))
    })
  }

  _end_round = () => {
    const depleted_piles = this._public_piles.update(this._deck, this._active_hint_indices)
    for (const p of depleted_piles) {
      this._clues.increment()
      this._players.msg_everyone(`Pile \`< ${p} >\` has been depleted, a new clue token was unlocked`)
    }
    this._bonus_cards.update(this._deck, this._active_hint_indices)
    this._clues.update(this._players.get_player_clues_given())
    this._players.end_round()

    this._active_hint_indices = []

    this._players.msg_everyone(`The current hint is over. Anyone can now give the next hint`)
    this._send_board_to_everyone()
    if (!this._clues.has_remaining()) {
      this._players.msg_everyone(`There are no more hints remaining. Everyone should now guess their word`)
      this._state = STATE.FINAL_GUESS
    } else {
      this._state = STATE.WAITING_FOR_HINT
    }
  }

  _advance = async ({ discord_user, args }) => {
    return await this._mutex.runExclusive(async () => {
      if (this._state !== STATE.DURING_HINT) {
        return make_ret(false, `Cannot end hint while no hint is in progress`)
      }

      if (args["_"].length < 2) {
        return make_ret(false, `You need to enter a character for your guess for this index. Call help for syntax.`)
      }

      const letter = args["_"][1]
      const { success, reply_msg, dm_msg, ...rest } = this._players.apply_to_player(discord_user, (player) => {
        return player.advance_to_next_letter(this._deck, letter)
      })
      if (!success) {
        return { success, reply_msg }
      }

      if (rest.on_bonus_letter) {
        this._players.msg_everyone(`\`${discord_user.username}\` has finished guessing all their letters, they're now on bonus letters`)
      } else {
        this._players.msg_everyone(`\`${discord_user.username}\` is advancing to the next letter`)
      }

      if (this._players.all_players_done_responded_to_hint()) {
        this._end_round()
      }
      return make_ret(true)
    })
  }

  _pass = async ({ discord_user, args }) => {
    return await this._mutex.runExclusive(async () => {
      if (this._state !== STATE.DURING_HINT) {
        return make_ret(false, `Cannot pass while no hint is in progress`)
      }

      const { success, reply_msg, dm_msg, ...rest } = this._players.apply_to_player(discord_user, (player) => {
        return player.pass()
      })
      if (!success) {
        return { success, reply_msg }
      }

      this._players.msg_everyone(`\`${discord_user.username}\` is passing this round`)
      if (this._players.all_players_done_responded_to_hint()) {
        this._end_round()
      }
      return make_ret(true)
    })
  }

  _guess_letter = async ({ discord_user, args }) => {
    return await this._mutex.runExclusive(async () => {
      if (this._state !== STATE.DURING_HINT) {
        return make_ret(false, `Cannot guess bonus letter when no hint is in progress`)
      }

      if (args["_"].length < 2) {
        return make_ret(false, `You need to specify the letter to guess`)
      }
      const letter = args["_"][1]

      const { success, reply_msg, dm_msg, ...rest } = this._players.apply_to_player(discord_user, (player) => {
        return player.guess_bonus(this._deck, letter)
      })
      if (!success) {
        return { success, reply_msg }
      }

      if (rest.correct) {
        this._players.msg_everyone(`\`${discord_user.username}\` correctly guessed their bonus letter!`)
        this._bonus_cards.add(letter.toLowerCase())
      } else {
        this._players.msg_everyone(`\`${discord_user.username}\` did not guess their letter.`)
      }

      if (this._players.all_players_done_responded_to_hint()) {
        this._end_round()
      }
      return make_ret(true)
    })
  }

  _final_guess = async ({ discord_user, args }) => {
    return await this._mutex.runExclusive(async () => {
      if (this._state !== STATE.FINAL_GUESS) {
        return make_ret(false, `Can't make final guess until all clues have been used`)
      }

      if (args["_"].length < 2) {
        return make_ret(false, `You need to specify the indices for your final guess. Call help for syntax.`)
      }
      const indices = args["_"][1]
      const { success, reply_msg, dm_msg, ...rest } = this._players.apply_to_player(discord_user, (player) => {
        return player.make_final_guess(indices, this._bonus_cards)
      })
      if (!success) {
        return { success, reply_msg }
      }

      this._players.msg_everyone(`\`${discord_user.username}\` updated their final guess`)
      this._send_board_to_everyone()
      if (this._players.all_players_have_final_guess()) {
        this._state = STATE.SHOWING_RESULTS
        this._players.msg_everyone(`All players made their final guess. Showing results`)
        this._players.msg_everyone(this._players.format_results())
        this._players.msg_everyone(`You can now vote for which words you think are spelled correctly`)
      }
      return make_ret(true)
    })
  }

  _show_results = async ({ discord_user, args }) => {
    return await this._mutex.runExclusive(async () => {
      if (this._state !== STATE.SHOWING_RESULTS) {
        return make_ret(false, `Can't show results until end of game`)
      }

      return make_ret(true, this._players.format_results())
    })
  }

  _vote_for_score = async ({ discord_user, args }) => {
    return await this._mutex.runExclusive(async () => {
      if (this._state !== STATE.SHOWING_RESULTS) {
        return make_ret(false, `Can't vote for score until the end of the game`)
      }

      if (args["_"].length < 2) {
        return make_ret(false, `You need to specify the player indices for your vote. Call help for syntax.`)
      }
      const votes = args["_"][1]
      const { success, reply_msg, dm_msg, ...rest } = this._players.add_votes(discord_user.id, votes)
      if (!success) {
        return { success, reply_msg }
      }

      this._players.msg_everyone(`\`${discord_user.username}\` believes [${rest.yes_vote_names}] have proper words`)
      this._players.msg_everyone(this._players.format_results())
      return make_ret(true)
    })
  }

  _debug = async (msg, args) => {
    return await this._mutex.runExclusive(async () => {
      if (args.end_round) {
        if (this._state !== STATE.DURING_HINT) {
          return make_ret(false, `can't end a round that doesn't exist`)
        }

        return this._end_round()
      }
      if (args.state) {
        make_ret(true, `\`\`\`State: ${this._state}\`\`\``)
      }

      if (args.add_hints) {
        this._clues.increment(parseInt(args.add_hints))
        make_ret(true, `Added ${args.add_hints} clue to "remaining clues" pile`)
      }

      if (args.shuffle_deck) {
        this._deck._cards.concat(this._deck._discard)
        make_ret(true, `Shuffled discard pile into deck.\n\`\`\`${JSON.stringify(this._deck, null, 2)}\`\`\``)
      }

      if (args.discard_cards) {
        this._deck.discard(this._deck.draw_cards(parseInt(args.discard_cards)))
        make_ret(true, `Discarded ${args.discard_cards} cards from the deck`)
      }

      if (args.deck) {
        make_ret(true, `\`\`\`${JSON.stringify(this._deck)}\`\`\``)
      }

      if (args.players) {
        for (const p of this._players.get()) {
          make_ret(true, `\`\`\`${JSON.stringify(p, null, 2)}\`\`\``)
        }
      }

      if (args.everything) {
        make_ret(true, `\`\`\`${JSON.stringify(this, null, 2)}\`\`\``)
      }

      if (args.public) {
        make_ret(true, `\`\`\`${JSON.stringify(this._public_piles, null, 2)}\`\`\``)
      }

      if (args.options) {
        make_ret(true, `\`\`\`${JSON.stringify(this.options, null, 2)}\`\`\``)
      }

      if (args.clues) {
        make_ret(true, `\`\`\`${JSON.stringify(this._clues, null, 2)}\`\`\``)
      }

      if (args.bonus) {
        make_ret(false, `\`\`\`${JSON.stringify(this._bonus_cards, null, 2)}\`\`\``)
      }

      if (args.consume_hints) {
        this._clues.decrement(parseInt(args.consume_hints))
        discord_user.send(`${args.consume_hints} hints were consumed`)
      }

      if (args.add_bonus) {
        this._bonus_cards.add(this._deck.draw_cards(1)[0])
        discord_user.send(`${args.add_bonus} bonus cards were added`)
      }

      if (args.remove_bonus) {
        const ii = parseInt(args.remove_bonus)
        if (!isNaN(ii) && (ii > 6) && ((ii - 7) < this._bonus_cards.length)) {
          this._bonus_cards.remove_by_index(this._deck, ii)
          discord_user.send(`< ${args.remove_bonus} > bonus card was removed`)
        } else {
          discord_user.send(`< ${args.remove_bonus} > bonus card was removed`)
        }
      }

      if (args.unlock_clues) {
        this._clues._remaining = this._clues._remaining + this._clues._locked
        this._clues._locked = 0
        discord_user.send(`unlocked locked clues`)
      }
      return make_ret(true)
    })
  }

  _send_board_to_everyone = () => {
    this._players.get().forEach((p, id) => p.send(this._format_board(id)))
  }

  _format_board = (messenger_id, help = false) => {
    return format_board(this._players, this._public_piles, this._bonus_cards, this._clues, messenger_id, help)
  }
}