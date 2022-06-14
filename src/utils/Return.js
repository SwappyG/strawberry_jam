export const make_ret = (success, reply_msg, dm_msg, data) => {
  return { success, reply_msg, dm_msg, ...data }
}