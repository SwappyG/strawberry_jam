export const help_str = (prefix) => {
  const P = prefix
  const new_game_msg = ` - \`${P}new_game <args...>\` or \`${P}N <args...>\` to start a new game\n     - \`--help\` to get help with args for this command`
  const join_game_msg = ` - \`${P}join_game <game_id>\` or \`${P}J <game_id>\` to join an existing game`
  const kill_game_msg = ` - \`${P}kill_game <game_id>\` or \`${P}K <game_id>\` to kill an existing game`
  const server_lobby_msg = ` - \`${P}server_lobby\` or \`${P}L\` server_lobby to kill an existing game.\n     - \`--id <game_id>\` to view detailed info about a single game`

  return `${new_game_msg}\n\n${join_game_msg}\n\n${kill_game_msg}\n\n${server_lobby_msg}`
}