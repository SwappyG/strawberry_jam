const format_bonus_card_line = (bonus_card, ii) => {
  `< ${7 + ii} > bonus\t[${bonus_card.toUpperCase()}]`
}

export const format_board = (players, public_piles, bonus_cards, clues, messenger_id) => {
  let ret = '\n\n< 0 > wildcard\t[*]\n'
  
  ret = `${ret}\n${players.format_for_board(messenger_id)}`
  ret = `${ret}\n${public_piles.format_for_board(players.num(), players.get_max_char_of_names() + 5)}`

  for (const [ii, bonus_card] of bonus_cards.entries()) {
    ret = `${ret}\n${format_bonus_card_line(bonus_card, ii)}`
  }

  ret = `${ret}\n\nRemaining Clues / ${format_clue_tokens(clues._remaining)} /`
  ret = `${ret}\nLocked Clues    / ${format_clue_tokens(clues._locked)} /`

  console.log(ret)
  return ret
}

export const format_hint = (player, players, public_piles, bonus_cards, hint_indices) => {
  console.log(player)
  let ret = ''
  for (let index of hint_indices) {
    index = parseInt(index)
    if (index === 0) {
      ret = ret + '*'
    } else if (index === player.num) {
      ret = ret + '?'
    } else if (index <= players.length) {
      ret = ret + players.get_player_active_letter_by_num(index).toUpperCase()
    } else if (index < 7) {
      ret = ret + public_piles.top(index, players.num()).toUpperCase()
    } else if (index - 7 < bonus_cards.length) {
      ret = ret + bonus_cards[index - 7].toUpperCase()
    } else {
      throw new Error(`Index passed to format hint out of bounds.\nNum Players: ${players.length}\nNum Public Piles: ${public_piles.length}\nNum Bonus Cards: ${bonus_cards.length}\nIndex: ${index}`)
    }
  }
  return ret
}

export const format_clue_tokens = (num) => {
  const div_10 = Math.floor(num/10)

  let ret = ''
  if (div_10 > 0) {
    ret = `(X)`
    ret = `${ret}${' (X)'.repeat(div_10-1)}`
    num = num % 10
  }

  const div_3 = Math.floor(num/3)
  const rem_3 = num % 3

  if (div_3 > 0) {
    ret = ret.length > 0 ? `${ret} (!)))` : `(!)))`
    ret = `${ret}${' (!)))'.repeat(div_3-1)}`
  }

  if (rem_3 > 0) {
    ret = ret.length > 0 ? `${ret} (!)` : `(!)`
    ret = `${ret}${')'.repeat(rem_3-1)}`
  }

  return `${ret}${' '.repeat(17-ret.length)}`
}