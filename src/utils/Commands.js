import { cyan_block, code_block } from "./DiscordFormat.js"
import { make_ret } from "./Return.js"

export class Commands {
  constructor() {
    this._cmds = new Map()
    this._aliases = new Map()
    this._help_func = () => ''
  }

  add = (cmd) => {
    this._cmds.set(cmd.name, cmd)
    if (cmd.alias != null) {
      this._aliases.set(cmd.alias, cmd.name)
    }
  }

  set_help_func = (func) => {
    this._help_func = func
  }

  list_cmds_and_descriptions = () => {
    return `${[...this._cmds].map(([k, v]) => `${v.format_help()}`).join('\n')}`
  }

  call = ({ func_args, cmd_line_args }) => {
    const cmd_name = cmd_line_args["_"][0]

    if (cmd_name === 'help' || cmd_name === 'h') {
      return make_ret(true, `\n${cyan_block('Available Commands')}\n${code_block(this.list_cmds_and_descriptions())}\n${this._help_func()}`)
    }

    const cmd = this._cmds.get(cmd_name) ?? this._cmds.get(this._aliases.get(cmd_name)) ?? null
    if (cmd === null) {
      return make_ret(false, `Command \`${cmd_name}\` is unknown`)
    }

    console.log(cmd)

    if (cmd_line_args['help'] || cmd_line_args['h']) {
      const pa = cmd.pos_args
      const ra = cmd.args.filter(a => !a.is_optional() && !a.hidden)
      const oa = cmd.args.filter(a => a.is_optional() && !a.hidden)
      const pos_args_help = `**Positional Args**\n${code_block(pa.map(a => a.format_help()).join('\n'))}`
      const req_args_help = `**Required Args**\n${code_block(ra.filter(a => !a.hidden).map(a => a.format_help()).join('\n'))}`
      const opt_args_help = `**Optional Args**\n${code_block(oa.filter(a => !a.hidden).map(a => a.format_help()).join('\n'))}`

      console.log(ra)

      const pos_summary = pa.length === 0 ? '' : `${pa.map(a => `${a.name}`).join(' ')}`
      const req_summary = ra.length === 0 ? '' : `${ra.map(a => `--${a.name} <${a.name}>`).join(' ')}`
      const opt_summary = oa.length === 0 ? '' : `[${oa.map(a => `--${a.name} <${a.name}>`).join('], [')}]`

      const usage = `**Usage**\n${code_block(`${cmd_name} ${pos_summary} ${req_summary} ${opt_summary}`)}`

      const ret = `${cyan_block(`${cmd_name} - ${cmd.help}`)}\n${usage}\n${pos_args_help}\n${req_args_help}\n${opt_args_help}`
      return make_ret(true, ret)
    }

    const { success, reply_msg, ...rest } = cmd.validate_and_cleanup(cmd_line_args)
    if (!success) {
      return { success, reply_msg }
    }

    return cmd.func({ func_args, args: rest.cmd_line_args })
  }
}