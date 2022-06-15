import { STATE } from "./State.js"

const word_msg = (prefix) => {
  return ` - \`${prefix}word <your_word>\` or \`${prefix}w <your_word>\` to set/change your secret word`
}

const start_msg = (prefix) => {
  return ` - \`${prefix}start\` or \`${prefix}s\` to start the game`
}

const lobby_msg = (prefix) => {
  return ` - \`${prefix}lobby\` or \`${prefix}l\` to see the lobby.`
}

const board_msg = (prefix) => {
  return ` - \`${prefix}board\` or \`${prefix}b\` to see the board.`
}

const view_hints_msg = (prefix) => {
  return ` - \`${prefix}view_hints\` or \`${prefix}v\` to see hints you've received.`
}

const clue_msg = (prefix) => {
  return ` - \`${prefix}clue <indices>\` or \`${prefix}c <indices>\` to give a hint to everyone else. Here, indexes is a comma separated list based on ids shown on the \`board\` (eg. \`4,3,0,0,5,3\`)`
}

const adv_msg = (prefix) => {
  return ` - \`${prefix}advance <letter_guess>\` or \`${prefix}a <letter_guess>\` to move to your next letter.`
}

const pass_msg = (prefix) => {
  return ` - \`${prefix}pass\` or \`${prefix}p\` to pass.`
}

const final_guess_msg = (prefix) => {
  ` - \`${prefix}final_guess <indexes>\` or \`${prefix}f <indexes>\` to give your final guess. ` +
    `Provide your final guess as comma seperated indexes of the letters you've been guessing. (eg \`4,3,1,5,2\`).\n` +
    ` - After you've guessed, wait for everyone else to finish guessing.`
}

const results_msg = (prefix) => {
  return ` - \`${prefix}results\` or \`${prefix}r\` to see the results.`
}

const end_msg = (prefix) => {
  return ` - \`${prefix}end\` or \`${prefix}e\` to end the game`
}

const vote_msg = (prefix) => {
  return ` - \`${prefix}vote <player_indices>\` or \`${prefix}V <player_indices>\` to vote for correct answers`
}

const help_creating_game = (prefix, player) => {
  if (player === null) {
    const main_msg = `A game is being created!`
    return `${main_msg}\n${lobby_msg(prefix)}\n`
  } else if (player.is_choosing_word()) {
    const main_msg = `You've joined the game.`
    return `${main_msg}\n${word_msg(prefix)}\n${start_msg(prefix)}\n${lobby_msg(prefix)}\n`
  } else {
    const main_msg = `You're ready to play!`
    return `${main_msg}\n${word_msg(prefix)}\n${start_msg(prefix)}\n${lobby_msg(prefix)}\n`
  }
}

const help_waiting_for_hint = (prefix, player) => {
  if (player === null) {
    return `_ _\n\nYou're not in the game. You can still do the following:\n${board_msg(prefix)}\n`
  }

  const main_msg = `The game is in progress.`
  return `${main_msg}\n${board_msg(prefix)}\n${view_hints_msg(prefix)}\n${clue_msg(prefix)}\n`
}

const help_during_hint = (prefix, player) => {
  if (player === null) {
    return `You're not in the game. You can still do the following:\n${board_msg(prefix)}\n`
  }

  if (player.is_giving_hint()) {
    return `A hint given by you is currently active. Wait for everyone to respond to it\n`
  }

  if (!player.is_responding_to_hint()) {
    return `A hint is active, wait for everyone else to respond.\n`
  }

  const main_msg = `_ _\n\nA hint is active and waiting for your response.`
  return `${main_msg}\n${adv_msg(prefix)}\n${pass_msg(prefix)}\n${board_msg(prefix)}\n${view_hints_msg(prefix)}`
}

const help_final_guess = (prefix, player) => {
  if (player === null) {
    return `You're not in the game. You can still do the following:\n${board_msg(prefix)}\n`
  }

  if (player.final_guess === null) {
    const main_msg = `No clue tokens remain, make your final guess.`
    return `${main_msg}\n${board_msg(prefix)}\n${view_hints_msg(prefix)}\n${final_guess_msg(prefix)}`
  } else {
    const main_msg = `You've made your final guess, wait for everyone else or change your guess.`
    return `${main_msg}\n${board_msg(prefix)}\n${view_hints_msg(prefix)}\n${final_guess_msg(prefix)}`
  }
}

const help_show_results = (prefix) => {
  const main_msg = `The game is over.`
  return `${main_msg}\n${results_msg(prefix)}\n${vote_msg(prefix)}\n${end_msg(prefix)}`
}

export const get_help_string = (state, prefix, player) => {
  const P = prefix

  switch (state) {
    case STATE.CREATING_GAME:
      return help_creating_game(prefix, player)
    case STATE.WAITING_FOR_HINT:
      return help_waiting_for_hint(prefix, player)
    case STATE.DURING_HINT:
      return help_during_hint(prefix, player)
    case STATE.FINAL_GUESS:
      return help_final_guess(prefix, player)
    case STATE.SHOWING_RESULTS:
      return help_show_results(prefix)
    default:
      return `The game has entered some unknown state, probably best to kill the bot and try again.`
  }
}