export const format_score_breakdown = (num_players) => {
  switch (num_players) {
    case 2: case 3:
      return `\`13-24\` 🍓\n\`25-37\` 🍓🍓\n\`38-49\` 🍓🍓🍓\n\`50-62\` 🍓🍓🍓🍓\n\`63+\` 🍓🍓🍓🍓🍓`
    case 4:
      return `\`16-31\` 🍓\n\`32-47\` 🍓🍓\n\`48-63\` 🍓🍓🍓\n\`64-79\` 🍓🍓🍓🍓\n\`80+\` 🍓🍓🍓🍓🍓`
    case 5:
      return `\`19-38\` 🍓\n\`39-58\` 🍓🍓\n\`59-77\` 🍓🍓🍓\n\`78-97\` 🍓🍓🍓🍓\n\`98+\` 🍓🍓🍓🍓🍓`
    case 6:
      return `\`23-45\` 🍓\n\`46-68\` 🍓🍓\n\`69-91\` 🍓🍓🍓\n\`92-114\` 🍓🍓🍓🍓\n\`115+\` 🍓🍓🍓🍓🍓`
  }
}