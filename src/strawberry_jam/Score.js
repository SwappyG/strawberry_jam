const _SCORE_BRACKETS = {
  2: [10, 18, 27, 36, 46, 1e6],
  3: [13, 25, 38, 50, 63, 1e6],
  4: [16, 32, 48, 64, 80, 1e6],
  5: [19, 39, 59, 78, 98, 1e6],
  6: [23, 46, 69, 92, 115, 1e6]
}

export const strawberries_from_score = (score, num_players) => {
  return '🍓'.repeat(_SCORE_BRACKETS[num_players].findIndex(ii => score < ii))
}

export const format_score_breakdown = (num_players) => {
  const scores = _SCORE_BRACKETS[num_players]
  return (
    `    🍓\`${scores[0]}-${scores[1] - 1}\`\n` +
    `   🍓🍓\`${scores[1]}-${scores[2] - 1}\`\n` +
    `  🍓🍓🍓\`${scores[2]}-${scores[3] - 1}\`\n` +
    ` 🍓🍓🍓🍓\`${scores[3]}-${scores[4] - 1}\`\n` +
    `🍓🍓🍓🍓🍓\`${scores[4]}+\`\n`
  )
}