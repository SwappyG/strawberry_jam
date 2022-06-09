import { Mutex } from 'async-mutex'

import { STATE } from './State.js'

import { Deck } from './Deck.js';
import { Players } from './Players.js';
import { BonusCards } from './BonusCards.js'
import { PublicPiles } from './PublicPiles.js';
import { Clues } from './Clues.js';

import { format_hint, format_board } from './FormatOutput.js'
import { get_help_string } from './Help.js';
import { char_array_to_int_array } from './String.js';

export class StrawberryJam {
  constructor(discord_client) {
    this._discord_cli = discord_client
    this._add_commands(this._discord_cli)
    this._deck = new Deck()

    this.mutex = new Mutex()
    this._options = {}
    this._state = STATE.IDLE
    this._players = new Players()
    this._public_piles = null
    this._bonus_cards = new BonusCards()
    this._clues = null
  }

  _add_commands = (cli) => {
    cli.add_command(["help", "h"], this._help)
    cli.add_command(["new", "n"], this._new_game)
    cli.add_command(["end", "e"], this._end_game)
    cli.add_command(["join", "j"], this._join_game)
    cli.add_command(["exit", "x"], this._exit_game)
    cli.add_command(["lobby", "l"], this._view_lobby)
    cli.add_command(["word", "w"], this._set_word)
    cli.add_command(["start", "s"], this._start_game)
    cli.add_command(["board", "b"], this._show_board)
    cli.add_command(["clue", "c"], this._give_clue)
    cli.add_command(["view", "v"], this._view_hints)
    cli.add_command(["pass", "p"], this._pass)
    cli.add_command(["advance", "a"], this._advance)
    cli.add_command(["guess", "g"], this._guess_letter)
    cli.add_command(["final", "f"], this._final_guess)
    cli.add_command(["results", "r"], this._show_results)
    cli.add_command(["vote", "V"], this._vote_for_score)
    cli.add_command(["_debug", "_d"], this._debug)
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
      this._discord_cli.msg_everyone(`Bonus card ${letter} was consumed`)
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

  _new_game = async (msg, args) => {
    await this.mutex.runExclusive(() => {
      if (this._state !== STATE.IDLE) {
        return this._discord_cli.log_and_reply(msg, `Cannot create game while another is already in progress. End game before starting a new one`)
      }

      if (args["_"].length < 2) {
        return this._discord_cli.log_and_reply(msg, `You need to specify how long each player's word will be`)
      }

      const length_of_words = parseInt(args["_"][1])
      if (isNaN(length_of_words) || length_of_words < 4 || length_of_words > 7) {
        return this._discord_cli.log_and_reply(msg, `Player words must be between 4 and 7, try again`)
      }

      this._options = {
        'length_of_words': length_of_words,
        'allow_single_player': args?.allow_single_player ?? false
      }
      this._players = new Players()
      this._public_piles = null
      this._bonus_cards = new BonusCards()
      this._deck = new Deck()
      this._state = STATE.CREATING_GAME
      this._clues = null
      return this._discord_cli.log_and_reply(msg, `A new game has been created`)
    })
  }

  _end_game = async (msg, args) => {
    await this.mutex.runExclusive(() => {
      if (this._state === STATE.IDLE) {
        const err = 'No game exists to end'
        console.log(err)
        msg.reply(err)
        return
      }

      this._discord_cli.msg_everyone(`${msg.author.username} has ended the game`)
      this._discord_cli.purge_users()
      this._state = STATE.IDLE
    })
  }

  _join_game = async (msg, args) => {
    await this.mutex.runExclusive(() => {
      if (this._state !== STATE.CREATING_GAME) {
        return this._discord_cli.log_and_reply(msg, `Cannot join before game exists or after its already running`)
      }

      const [success, ...ret] = this._players.add_player({
        discord_id: msg.author.id,
        name: msg.author.username,
        length_of_words: this._options.length_of_words
      })

      if (!success) {
        return this._discord_cli.log_and_reply(msg, ret[0])
      }

      this._discord_cli.add_user(msg.author)
      this._discord_cli.msg_everyone(`${msg.author.username} has joined in the game!`)
      this._discord_cli.log_and_reply(msg, `You've joined the game! From here on, DM all commands, DON'T MSG IN PUBLIC CHANNEL`)
      this._discord_cli.msg_user(msg.author.id, `Choose a word that is \`${this._options.length_of_words}\` characters long`)
    })
  }

  _exit_game = async (msg, args) => {
    await this.mutex.runExclusive(() => {
      if (this._state !== STATE.CREATING_GAME) {
        return this._discord_cli.log_and_reply(msg, `Cannot leave before game exists or after its already running`)
      }

      const [success, ...ret] = this._players.remove_player(msg.author.id)
      if (!success) {
        return this._discord_cli.log_and_reply(msg, ret[0])
      }

      this._discord_cli.remove_user(msg.author)
      this._discord_cli.msg_everyone(`${msg.author.username} has left the game`)
      this._discord_cli.log_and_reply(msg, `${msg.author.username} has left the game`)
    })
  }

  _view_lobby = async (msg, args) => {
    await this.mutex.runExclusive(() => {
      if (this._state === STATE.IDLE) {
        return this._discord_cli.log_and_reply(msg, `Cannot show lobby while game doesn't exist`)
      }

      this._discord_cli.log_and_reply(msg, this._players.format_player_states())
    })
  }

  _set_word = async (msg, args) => {
    await this.mutex.runExclusive(() => {
      if (this._state !== STATE.CREATING_GAME) {
        return this._discord_cli.log_and_reply(msg, `Cannot set word before game exists or after its already running`)
      }

      if (msg.channel.type !== 'dm') {
        return this._discord_cli.log_and_reply(msg, `Your secret word must be a DM! Choose a new word and DM it instead`)
      }

      if (args["_"].length < 2) {
        return this._discord_cli.log_and_reply(msg, `You need to specify your word. Call help for syntax.`)
      }

      const word = args["_"][1]
      const [success, ...ret] = this._players.apply_to_player(msg.author.id, (player) => {
        return player.set_word_from_deck(this._deck, word)
      })
      if (!success) {
        return this._discord_cli.log_and_reply(msg, ret[0])
      }

      this._deck = ret[0]
      this._discord_cli.msg_user(msg.author.id, ret[1])
    })
  }

  _start_game = async (msg, args) => {
    await this.mutex.runExclusive(() => {
      if (this._state !== STATE.CREATING_GAME) {
        return this._discord_cli.log_and_reply(msg, `Cannot start a game before it's been created or while one is running`)
      }

      const [success, ...ret] = this._players.assign_word_to_all_players(msg.author.id, this._options)
      if (!success) {
        return this._discord_cli.log_and_reply(msg, ret[0])
      }
      this._discord_cli.msg_everyone(ret[0])

      this._public_piles = new PublicPiles(this._deck, this._players.num(), this._options)
      this._clues = new Clues(this._players.num())
      this._state = STATE.WAITING_FOR_HINT

      for (const player of this._players.players()) {
        this._discord_cli.msg_user(player.id, this._format_board(player.id))
      }
    })
  }

  _show_board = async (msg, args) => {
    await this.mutex.runExclusive(() => {
      if (![STATE.WAITING_FOR_HINT, STATE.DURING_HINT, STATE.FINAL_GUESS, STATE.SHOWING_RESULTS].includes(this._state)) {
        return this._discord_cli.log_and_reply(msg, `There is either no game, or it's still being created`)
      }

      this._discord_cli.msg_user(msg.author.id, this._format_board(msg.author.id, args.help))
    })
  }

  _give_clue = async (msg, args) => {
    await this.mutex.runExclusive(() => {
      if (this._state !== STATE.WAITING_FOR_HINT) {
        return this._discord_cli.log_and_reply(msg, `Cannot give a hint, either game hasn't started or another hint is in progress`)
      }

      if (args["_"].length < 2) {
        return this._discord_cli.log_and_reply(msg, `You need to specify your hint. Call help for syntax.`)
      }
      const hint = args["_"][1]

      const [success, ...ret] = this._players.apply_to_player(msg.author.id, (player) => {
        const [success, ...ret] = this._parse_hint_indices(hint, player.num)
        if (success) { player.give_hint() }
        return [success, ...ret]
      })
      if (!success) {
        return this._discord_cli.log_and_reply(msg, ret[0])
      }
      this._active_hint_indices = ret[0]

      for (const player of this._players.players()) {
        let ret = format_hint(player, this._players, this._public_piles, this._bonus_cards, this._active_hint_indices)
        if (player.id === msg.author.id) {
          this._discord_cli.log_and_reply(msg, `you just sent the hint: \`${ret}\``, true)
        } else if (this._active_hint_indices.includes(player.num)) {
          this._discord_cli.msg_user(player.id, `_ _\n\n${msg.author.username} sent you a new hint: \`${ret}\`\n`)
          player.receive_hint(ret)
        } else {
          this._discord_cli.msg_user(player.id, `_ _\n\n${msg.author.username} sent a hint, but you're not part of it: \`${ret}\`\n`)
        }
        this._discord_cli.msg_user(player.id, this._format_board(player.id))
      }
      this._clues.decrement()
      this._state = STATE.DURING_HINT

      if (this._players.all_players_done_responding_to_hint()) {
        this._end_round()
      }
    })
  }

  _view_hints = async (msg, args) => {
    await this.mutex.runExclusive(() => {
      if (![STATE.WAITING_FOR_HINT, STATE.DURING_HINT, STATE.FINAL_GUESS, STATE.SHOWING_RESULTS].includes(this._state)) {
        return this._discord_cli.log_and_reply(msg, `There is no active game`)
      }

      const [success, ...ret] = this._players.apply_to_player(msg.author.id, (player) => {
        return [true, player.format_received_hints()]
      })
      if (!success) {
        this._discord_cli.log_and_reply(msg, ret[0])
      }
      this._discord_cli.msg_user(msg.author.id, `_ _\n\nYou've received the following hints.${ret[0]}`)
    })
  }

  _end_round = () => {
    const depleted_piles = this._public_piles.update(
      this._deck, this._active_hint_indices, this._players.num())
    for (const p of depleted_piles) {
      this._clues.increment()
      this._discord_cli.msg_everyone(`Pile \`< ${p} >\` has been depleted, a new clue token was unlocked`)
    }
    this._bonus_cards.update(this._active_hint_indices)
    this._clues.update(this._players.get_player_clues_given())
    this._players.end_round()

    this._active_hint_indices = []

    this._discord_cli.msg_everyone(`The current hint is over. Anyone can now give the next hint`)
    for (const p of this._players.players()) {
      this._discord_cli.msg_user(p.id, this._format_board(p.id))
    }
    if (!this._clues.has_remaining()) {
      this._discord_cli.msg_everyone(`There are no more hints remaining. Everyone should now guess their word`)
      this._state = STATE.FINAL_GUESS
    } else {
      this._state = STATE.WAITING_FOR_HINT
    }
  }

  _advance = async (msg, args) => {
    await this.mutex.runExclusive(() => {
      if (this._state !== STATE.DURING_HINT) {
        return this._discord_cli.log_and_reply(msg, `Cannot end hint while no hint is in progress`)
      }

      if (args["_"].length < 2) {
        return this._discord_cli.log_and_reply(msg, `You need to enter a character for your guess for this index. Call help for syntax.`)
      }

      const letter = args["_"][1]
      const [success, ...ret] = this._players.apply_to_player(msg.author.id, (player) => {
        return player.advance_to_next_letter(this._deck, letter)
      })
      if (!success) {
        return this._discord_cli.log_and_reply(msg, ret[0])
      }

      this._discord_cli.msg_everyone(ret[0])
      if (ret[1].length > 0) {
        this._discord_cli.log_and_reply(msg, ret[1])
      }

      this._discord_cli.msg_user(msg.author.id, this._format_board(msg.author.id))
      if (this._players.all_players_done_responding_to_hint()) {
        this._end_round()
      }
    })
  }

  _pass = async (msg, args) => {
    await this.mutex.runExclusive(() => {
      if (this._state !== STATE.DURING_HINT) {
        return this._discord_cli.log_and_reply(msg, `Cannot pass while no hint is in progress`)
      }

      const [success, ...ret] = this._players.apply_to_player(msg.author.id, (player) => {
        return player.pass()
      })
      if (!success) {
        return this._discord_cli.log_and_reply(msg, ret[0])
      }

      this._discord_cli.msg_everyone(ret[0])
      this._discord_cli.msg_user(msg.author.id, this._format_board(msg.author.id))
      if (this._players.all_players_done_responding_to_hint()) {
        this._end_round()
      }
    })
  }

  _guess_letter = async (msg, args) => {
    await this.mutex.runExclusive(() => {
      if (this._state !== STATE.DURING_HINT) {
        return this._discord_cli.log_and_reply(msg, `Cannot guess bonus letter when no hint is in progress`)
      }

      if (args["_"].length < 2) {
        return this._discord_cli.log_and_reply(msg, `You need to specify the letter to guess`)
      }
      const letter = args["_"][1]

      const [success, ...ret] = this._players.apply_to_player(msg.author.id, (player) => {
        return player.guess_bonus(this._deck, letter)
      })
      if (!success) {
        return this._discord_cli.log_and_reply(msg, ret[0])
      }

      this._discord_cli.msg_everyone(ret[1])
      if (ret[0]) {
        this._bonus_cards.add(letter.toLowerCase())
      }

      this._discord_cli.msg_user(msg.author.id, this._format_board(msg.author.id))
      if (this._players.all_players_done_responding_to_hint()) {
        this._end_round()
      }
    })
  }

  _final_guess = async (msg, args) => {
    await this.mutex.runExclusive(() => {
      if (this._state !== STATE.FINAL_GUESS) {
        return this._discord_cli.log_and_reply(msg, `Can't make final guess until all clues have been used`)
      }

      if (args["_"].length < 2) {
        return this._discord_cli.log_and_reply(msg, `You need to specify the indices for your final guess. Call help for syntax.`)
      }
      const indices = args["_"][1]
      const [success, ...ret] = this._players.apply_to_player(msg.author.id, (player) => {
        return player.make_final_guess(indices, this._bonus_cards)
      })
      if (!success) {
        return this._discord_cli.log_and_reply(msg, ret[0])
      }

      if (ret[0]) {
        this._discord_cli.msg_everyone(`${msg.author.username} just used the wild card \`[*]\` in their final guess`)
      }
      for (const letter of ret[1]) {
        this._discord_cli.msg_everyone(`${msg.author.username} just used the bonus letter \`[${letter}]\` in their final guess`)
      }
      this._discord_cli.msg_everyone(ret[2])
      this._discord_cli.msg_user(msg.author.id, this._format_board(msg.author.id))

      if (this._players.all_players_have_final_guess()) {
        this._state = STATE.SHOWING_RESULTS
        this._discord_cli.msg_everyone(`All players made their final guess. Showing results`)
        this._discord_cli.msg_everyone(this._players.format_results())
        this._discord_cli.msg_everyone(`You can now vote for which words you think are spelled correctly`)
      }
    })
  }

  _show_results = async (msg, args) => {
    await this.mutex.runExclusive(() => {
      if (this._state !== STATE.SHOWING_RESULTS) {
        return this._discord_cli.log_and_reply(msg, `Can't results until end of game`)
      }

      return this._discord_cli.log_and_reply(msg, this._players.format_results())
    })
  }

  _vote_for_score = async (msg, args) => {
    await this.mutex.runExclusive(() => {
      if (this._state !== STATE.SHOWING_RESULTS) {
        return this._discord_cli.log_and_reply(msg, `Can't vote for score until the end of the game`)
      }

      if (args["_"].length < 2) {
        return this._discord_cli.log_and_reply(msg, `You need to specify the player indices for your vote. Call help for syntax.`)
      }
      const votes = args["_"][1]
      const [success, ...ret] = this._players.add_votes(msg.author.id, votes)
      if (!success) {
        return this._discord_cli.log_and_reply(msg, ret[0])
      }
      this._discord_cli.msg_everyone(ret[0])
      this._discord_cli.msg_everyone(this._players.format_results())
    })
  }

  _help = async (msg, args) => {
    await this.mutex.runExclusive(() => {
      const help_str = get_help_string(this._state, this._discord_cli.prefix, this._players.get_player(msg.author.id))
      this._discord_cli.log_and_reply(msg, help_str)
    })
  }

  _debug = async (msg, args) => {
    await this.mutex.runExclusive(() => {
      if (args.end_round) {
        if (this._state !== STATE.DURING_HINT) {
          return this._discord_cli.log_and_reply(msg, `can't end a round that doesn't exist`)
        }

        return this._end_round()
      }
      if (args.state) {
        this._discord_cli.log_and_reply(msg, `\`\`\`State: ${this._state}\`\`\``)
      }

      if (args.add_hints) {
        this._clues.increment(parseInt(args.add_hints))
        this._discord_cli.log_and_reply(msg, `Added ${args.add_hints} clue to "remaining clues" pile`)
      }

      if (args.shuffle_deck) {
        this._deck._cards.concat(this._deck._discard)
        this._discord_cli.log_and_reply(msg, `Shuffled discard pile into deck.\n\`\`\`${JSON.stringify(this._deck, null, 2)}\`\`\``)
      }

      if (args.discard_cards) {
        this._deck.discard(this._deck.draw_cards(parseInt(args.discard_cards)))
        this._discord_cli.log_and_reply(msg, `Discarded ${args.discard_cards} cards from the deck`)
      }

      if (args.deck) {
        this._discord_cli.log_and_reply(msg, `\`\`\`${JSON.stringify(this._deck)}\`\`\``)
      }

      if (args.players) {
        for (const p of this._players.players()) {
          this._discord_cli.log_and_reply(msg, `\`\`\`${JSON.stringify(p, null, 2)}\`\`\``)
        }
      }

      if (args.everything) {
        this._discord_cli.log_and_reply(msg, `\`\`\`${JSON.stringify(this, null, 2)}\`\`\``)
      }

      if (args.public) {
        this._discord_cli.log_and_reply(msg, `\`\`\`${JSON.stringify(this._public_piles, null, 2)}\`\`\``)
      }

      if (args.options) {
        this._discord_cli.log_and_reply(msg, `\`\`\`${JSON.stringify(this._options, null, 2)}\`\`\``)
      }

      if (args.clues) {
        this._discord_cli.log_and_reply(msg, `\`\`\`${JSON.stringify(this._clues, null, 2)}\`\`\``)
      }

      if (args.bonus) {
        this._discord_cli.log_and_reply(msg, `\`\`\`${JSON.stringify(this._bonus_cards, null, 2)}\`\`\``)
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
          this._discord_cli.log_and_reply(msg, `Index for bonus cards is too large`)
        }
      }

      if (args.unlock_clues) {
        this._clues._remaining = this._clues._remaining + this._clues._locked
        this._clues._locked = 0
        this._discord_cli.log_and_reply(msg, `Force unlocked clues`)
      }
    })
  }
}