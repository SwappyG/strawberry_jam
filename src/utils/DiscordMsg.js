export const log_and_reply = (discord_msg, text) => {
  console.log(text)
  discord_msg.reply(text)
}