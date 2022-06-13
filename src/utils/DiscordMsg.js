export const log_and_reply = (discord_msg, text) => {
  console.log(text)
  discord_msg.reply(text)
}

export const msg_user = (discord_user, text) => {
  console.log(text)
  discord_user.send(text)
} 