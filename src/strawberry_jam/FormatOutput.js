const format_board_help = () => {
  return (
    `< 0 > wildcard     [*]    / IS_AVAIL` + `\n` +
    `\n` +
    `   ,-player num            ,-current letter      ,-clue space     ,-state` + `\n` +
    `< 1 > Player1      [ ][ ][?][ ][ ] /    /                 / RESPONDING_TO_HINT` + `\n` +
    `                                     ^- bonus letter spot` + `\n` +
    `\n` +
    `< 2 > Player2      [ ][ ][ ][E][ ]/     /                 / GIVING_HINT` + `\n` +
    `< 3 > Player3      [ ][ ][ ][ ][ ]/ [G] /                 / READY` + `\n` +
    `\n` +
    `                        ,-cards in pile` + `\n` +
    `< 4 > public       [S]]]]]   / (!) /` + `\n` +
    `                                ^-hint clue below pile` + `\n` +
    `                                 ,-depleted clue token` + `\n` +
    `< 5 > public       [T]       /     /` + `\n` +
    `< 6 > public       [P]]]     / (!) /` + `\n` +
    `\n` +
    `                                ,-usage in final guess` + `\n` +
    `< 7 > bonus        [K]    / IS_USED` + `\n` +
    `< 8 > bonus        [A]    / IS_AVAIL` + `\n` +
    `\n` +
    `\n                  ,-pile of 3 clues` + `\n` +
    `Remaining Clues / (!))) (!))) (!)   /` + `\n` +
    `Locked Clues    / (!)))             /` + `\n`
  )
}

export const format_board = (players, public_piles, bonus_cards, clues, messenger_id, help = false) => {
  if (help) {
    return `\`\`\`${format_board_help()}\`\`\``
  }

  let ret = `\n\n`
  const player = players.get_player(messenger_id)
  const active_hint = player.get_active_hint()
  if (active_hint !== null) {
    ret = `${ret}Active Hint: ${active_hint}\n\n`
  }

  const name_len = players.get_max_char_of_names() + 5
  ret = `${ret}${bonus_cards.format_wildcard_for_board(name_len)}\n\n`
  ret = `${ret}${players.format_for_board(messenger_id)}\n`
  ret = `${ret}${public_piles.format_for_board(players.num(), name_len)}\n`

  const formatted_bonus_cards = bonus_cards.format_for_board(name_len)
  if (formatted_bonus_cards.length > 0) {
    ret = `${ret}${bonus_cards.format_for_board(name_len)}\n`
  }

  ret = `${ret}\nRemaining Clues / ${format_clue_tokens(clues._remaining)} /`
  ret = `${ret}\nLocked Clues    / ${format_clue_tokens(clues._locked)} /`

  console.log(ret)
  return `\`\`\`${ret}\`\`\``
}

export const format_hint = (player, players, public_piles, bonus_cards, hint_indices) => {
  let ret = ''
  for (let index of hint_indices) {
    index = parseInt(index)
    if (index === 0) {
      ret = ret + '*'
    } else if (index === player.num) {
      ret = ret + '?'
    } else if (index <= players.num()) {
      ret = ret + players.get_player_active_letter_by_num(index).toUpperCase()
    } else if (index < 7) {
      ret = ret + public_piles.top(index, players.num()).toUpperCase()
    } else if (index - 7 < bonus_cards.num()) {
      ret = ret + bonus_cards.get(index - 7)[0].toUpperCase()
    } else {
      throw new Error(`Index passed to format hint out of bounds.\nNum Players: ${players.length}\nNum Public Piles: ${public_piles.length}\nNum Bonus Cards: ${bonus_cards.length}\nIndex: ${index}`)
    }
  }
  return ret
}

export const format_clue_tokens = (num) => {
  const div_10 = Math.floor(num / 10)

  let ret = ''
  if (div_10 > 0) {
    ret = `(X)`
    ret = `${ret}${' (X)'.repeat(div_10 - 1)}`
    num = num % 10
  }

  const div_3 = Math.floor(num / 3)
  const rem_3 = num % 3

  if (div_3 > 0) {
    ret = ret.length > 0 ? `${ret} (!)))` : `(!)))`
    ret = `${ret}${' (!)))'.repeat(div_3 - 1)}`
  }

  if (rem_3 > 0) {
    ret = ret.length > 0 ? `${ret} (!)` : `(!)`
    ret = `${ret}${')'.repeat(rem_3 - 1)}`
  }

  return `${ret}${' '.repeat(17 - ret.length)}`
}