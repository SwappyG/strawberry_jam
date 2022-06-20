import { cyan_block, code_block } from "./DiscordFormat.js"
import { make_ret } from "./Return.js"

export class Commands {
  constructor() {
    this._cmds = new Map()
    this._aliases = new Map()
  }

  add = (cmd) => {
    this._cmds.set(cmd.name, cmd)
    if (cmd.alias != null) {
      this._aliases.set(cmd.alias, cmd.name)
    }
  }

  merge = (cmds) => {
    const cmd_names = [...this._cmds].map(([k, v]) => k)
    const conflicting_cmd_names = cmds.filter(c => cmd_names.includes(c))
    if (conflicting_cmd_names.length > 0) {
      throw new Error(`Can't merge \`Commands\` objects, they contain the following conflicting command names: \`${conflicting_cmd_names}\``)
    }

    const alias_names = [...this._aliases].map(([k, v]) => k)
    const conflicting_alias_names = cmds.filter(c => cmd_names.includes(c))
    if (conflicting_alias_names.length > 0) {
      throw new Error(`Can't merge \`Commands\` objects, they contain the following conflicting alias names: \`${conflicting_alias_names}\``)
    }

    cmds._cmds.forEach(([v, k]) => this._cmds.set(k, v))
    cmds._aliases.forEach(([v, k]) => this._aliases.set(k, v))
  }

  exists = (name) => {
    return this._cmds.get(name) !== undefined || this._aliases.get(name) !== undefined
  }

  help = () => {
    return [...this._cmds].filter(([k, v]) => !v.is_hidden).map(([k, v]) => `${v.format_help()}`)
  }

  call = ({ cmd_line_args, ...others }) => {
    const cmd_name = cmd_line_args["_"][0]

    if (cmd_name === 'help' || cmd_name === 'h') {
      return make_ret(true, `\n${cyan_block('Available Commands')}\n${code_block(this.help().join("\n"))}`)
    }

    const cmd = this._cmds.get(cmd_name) ?? this._cmds.get(this._aliases.get(cmd_name)) ?? null
    if (cmd === null) {
      return make_ret(false, `Command \`${cmd_name}\` is unknown`)
    }

    if (cmd_line_args['help'] || cmd_line_args['h']) {
      return make_ret(true, cmd.format_detailed_help())
    }

    const { success, reply_msg, ...rest } = cmd.validate_and_cleanup(cmd_line_args)
    if (!success) {
      return { success, reply_msg }
    }

    return cmd.func({ args: rest.cmd_line_args, ...others })
  }
}