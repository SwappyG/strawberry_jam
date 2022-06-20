import { Arg } from "../utils/Arg.js"
import { make_ret } from "../utils/Return.js"
import { Command } from "../utils/Command.js"
import { is_letters } from "../utils/String.js"

export const make_word_command = (func) => {
  return new Command({
    name: 'word',
    alias: 'w',
    help: "Set your secret word for the game",
    func: func,
    pos_args: [
      new Arg({
        name: 'word',
        type: 'string',
        help: `Your secret word. Length must match the number of letters set for the game. Cannot use [J, Q, X, V, Z]`,
        validator: value => {
          value = value.toLowerCase()
          if (!is_letters(value)) { return make_ret(false, `Your guess must be made of letters`) }
          if (['j', 'q', 'x', 'v', 'z'].some(badchar => value.includes(badchar))) {
            return make_ret(false, `\`J\`, \`Q\`, \`V\`, \`X\`, and \`Z\` are not valid characters`)
          }
          return make_ret(true, null, null, { value: value })
        },
      }),
    ],
    args: [
      new Arg({ name: 'is_dm', type: 'boolean', hidden: true })
    ],
  })
}

export const make_start_command = (func) => {
  return new Command({
    name: 'start',
    alias: 's',
    help: "Starts the game if all joined players are ready",
    func: func,
    pos_args: [],
    args: [
      new Arg({ name: 'is_dm', type: 'boolean', hidden: true })
    ],
  })
}

export const make_end_game_command = (func) => {
  return new Command({
    name: 'end',
    alias: 'e',
    help: "Ends the current game",
    func: func,
    pos_args: [],
    args: [
      new Arg({ name: 'is_dm', type: 'boolean', hidden: true })
    ],
  })
}

export const make_board_command = (func) => {
  return new Command({
    name: 'board',
    alias: 'b',
    help: "Shows the current state of the board",
    func: func,
    pos_args: [],
    args: [
      new Arg({ name: 'is_dm', type: 'boolean', hidden: true })
    ],
  })
}

export const make_clue_command = (func) => {
  return new Command({
    name: 'clue',
    alias: 'c',
    help: "Give a clue to the other players.",
    func: func,
    pos_args: [
      new Arg({
        name: 'clue',
        type: 'number',
        is_list: true,
        int_only: true,
        range: { min: 0 },
        help: `Comma seperated list of indices of wild card, players, public piles or bonus cards as shown on the \`board\`.\nEg. \`3,2,4,0,7,7\` - where \`2\`, \`3\`, and \`4\` are players or public piles, \`0\` is the wild card and \`7\` is a bonus card.\n**Note** Bonus and public pile cards used in a clue are consumed.`
      })
    ],
    args: [
      new Arg({ name: 'is_dm', type: 'boolean', hidden: true })
    ],
  })
}

export const make_pass_command = (func) => {
  return new Command({
    name: 'pass',
    alias: 'p',
    help: "Remain on current letter when given a clue by another player",
    func: func,
    pos_args: [],
    args: [
      new Arg({ name: 'is_dm', type: 'boolean', hidden: true })
    ],
  })
}

export const make_advance_command = (func) => {
  return new Command({
    name: 'advance',
    alias: 'a',
    help: "Record guess for active letter and move to next letter (or bonus cards if this was the last letter)",
    func: func,
    pos_args: [
      new Arg({
        name: 'guess',
        type: 'string',
        validator: a => {
          a = a.toLowerCase()
          if (a.length !== 1) { return make_ret(false, `Your guess must be a single character`) }
          if (!is_letters(a)) { return make_ret(false, `Your guess must be a letter`) }
          if (['j', 'q', 'x', 'v', 'z'].includes(a)) { return make_ret(false, `\`J\`, \`Q\`, \`V\`, \`X\`, and \`Z\` are not valid characters`) }
          return make_ret(true, null, null, { value: a })
        },
        help: `A single character excluding [J, Q, V, X, Z]`
      })
    ],
    args: [
      new Arg({ name: 'is_dm', type: 'boolean', hidden: true })
    ],
  })
}

export const make_guess_bonus_command = (func) => {
  return new Command({
    name: 'guess_bonus',
    alias: 'g',
    help: "Guess current bonus letter. Only valid if on bonus letters",
    func: func,
    pos_args: [
      new Arg({
        name: 'letter',
        type: 'string',
        validator: a => {
          a = a.toLowerCase()
          if (a.length !== 1) { return make_ret(false, `Your guess must be a single character`) }
          if (!is_letters(a)) { return make_ret(false, `Your guess must be a letter`) }
          if (['j', 'q', 'x', 'v', 'z'].includes(a)) { return make_ret(false, `\`J\`, \`Q\`, \`V\`, \`X\`, and \`Z\` are not valid characters`) }
          return make_ret(true, null, null, { value: a })
        },
        help: `A single character excluding [J, Q, V, X, Z]`
      })
    ],
    args: [
      new Arg({ name: 'is_dm', type: 'boolean', hidden: true })
    ],
  })
}

export const make_view_clues_command = (func) => {
  return new Command({
    name: 'view_clues',
    alias: 'v',
    help: "Show all clues you've received so far",
    func: func,
    pos_args: [],
    args: [
      new Arg({ name: 'is_dm', type: 'boolean', hidden: true })
    ],
  })
}


export const make_final_guess_command = (func) => {
  return new Command({
    name: 'final_guess',
    alias: 'f',
    help: "Guess the original word assigned to you",
    func: func,
    pos_args: [
      new Arg({
        name: 'indices',
        type: 'string',
        is_list: true,
        help: `Comma seperated list of indices for order to place cards for final guess. Indices correspond to letters of assigned word, \`1\` thru length of word.\nFor wild, use \`0\`.\nFor bonus cards, use \`b\` infront of index of bonus card.\nEg. \`2,1,3,0,5,b7\`. Letter \`4\` is replaced by wild. Bonus card \`7\` is used to extend word. Assigned letters \`1\`, \`2\`, \`3\` and \`5\` are rearranged as specified in list. `
      })
    ],
    args: [
      new Arg({ name: 'is_dm', type: 'boolean', hidden: true })
    ],
  })
}

export const make_results_command = (func) => {
  return new Command({
    name: 'results',
    alias: 'r',
    help: "Show the final results of the game",
    func: func,
    pos_args: [],
    args: [
      new Arg({ name: 'is_dm', type: 'boolean', hidden: true })
    ],
  })
}

export const make_vote_command = (func) => {
  return new Command({
    name: 'vote',
    alias: 'V',
    help: "Vote for which words you think are spelt correctly",
    func: func,
    pos_args: [
      new Arg({
        name: 'votes',
        type: 'number',
        is_list: true,
        int_only: true,
        range: { min: 1 },
        help: `Comma seperated list of indices containing each player that you think spelt a real word.\nEg. \`1,3,4\` - This means you believe players \`1\`, \`3\` and \`4\` spelt their word correctly, the rest did not.`
      })
    ],
    args: [
      new Arg({ name: 'is_dm', type: 'boolean', hidden: true })
    ],
  })
}

export const make_lobby_command = (func) => {
  return new Command({
    name: 'lobby',
    alias: 'l',
    help: "Show info about the state of each player in the game",
    func: func,
    pos_args: [],
    args: [
      new Arg({ name: 'is_dm', type: 'boolean', hidden: true })
    ],
  })
}

export const make_debug_command = (func) => {
  return new Command({
    name: '_debug',
    alias: '_d',
    help: "Dev command for testing purposes. Various effects",
    func: func,
    pos_args: [],
    args: [
      new Arg({ name: 'end_round', type: 'boolean', default_value: false }),
      new Arg({ name: 'shuffle_deck', type: 'boolean', default_value: false }),
      new Arg({ name: 'state', type: 'boolean', default_value: false }),
      new Arg({ name: 'add_hints', type: 'number', int_only: true, validator: a => make_ret(a > 0, a <= 0 ? 'Should be positive' : ''), default_value: false }),
      new Arg({ name: 'consume_hints', type: 'number', int_only: true, validator: a => make_ret(a < 0, a >= 0 ? 'Should be negative' : ''), default_value: false }),
      new Arg({ name: 'deck', type: 'boolean', default_value: false }),
      new Arg({ name: 'players', type: 'boolean', default_value: false }),
      new Arg({ name: 'everything', type: 'boolean', default_value: false }),
      new Arg({ name: 'players', type: 'boolean', default_value: false }),
      new Arg({ name: 'public', type: 'boolean', default_value: false }),
      new Arg({ name: 'options', type: 'boolean', default_value: false }),
      new Arg({ name: 'clues', type: 'boolean', default_value: false }),
      new Arg({ name: 'bonus', type: 'boolean', default_value: false }),
      new Arg({ name: 'add_bonus', type: 'number', int_only: true, validator: a => make_ret(a > 0, a <= 0 ? 'Should be positive' : ''), default_value: false }),
      new Arg({ name: 'remove_bonus', type: 'number', int_only: true, validator: a => make_ret(a > 6, a <= 6 ? 'Should be id of bonus card' : ''), default_value: false }),
      new Arg({ name: 'is_dm', type: 'boolean', hidden: true })
    ],
    is_hidden: true,
  })
}