export const code_block = (text) => {
  return `\`\`\`${text.length > 0 ? text : ' '}\`\`\``
}

export const inline_code = (text) => {
  return `\`${text}\``
}

export const cyan_block = (text) => {
  return `\`\`\`yaml\n${text.length > 0 ? text : ' '}\n\`\`\``
}