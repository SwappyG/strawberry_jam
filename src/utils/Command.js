import { make_ret } from "./Return.js"
import { code_block } from "./DiscordFormat.js"
import { cyan_block } from "./DiscordFormat.js"

export class Command {
  constructor({ name, func, help, pos_args, args, alias, is_hidden }) {
    this.name = name
    this.alias = alias ?? null
    this.help = help ?? 'Help is not documented for this command'
    this.func = func
    this.pos_args = pos_args
    this.args = args
    this.is_hidden = is_hidden ?? false

    if (['help', 'h'].includes(name?.toLowerCase())) {
      throw new Error(`A Command cannot be named \`help\` or \`h\``)
    }

    if (['help', 'h'].includes(alias?.toLowerCase())) {
      throw new Error(`An Commands's alias cannot be named \`help\` or \`h\``)
    }
  }

  is = (name) => {
    return name === this.name || name === this.alias
  }

  validate_and_cleanup = (cmd_line_args) => {
    const pos_args = JSON.parse(JSON.stringify(cmd_line_args["_"].slice(1)))
    if (pos_args.length > this.pos_args.length) {
      const pos_args_names = `[${this.pos_args.map(a => a.name).join('], [')}]`
      return make_ret(false, `Got too many positional args, only expected to get: ${pos_args_names}`)
    }
    if (pos_args.length < this.pos_args.length) {
      const pos_args_names = `[${this.pos_args.map(a => a.name).join('], [')}]`
      const partial_pos_args_names = this.pos_args.slice(0, pos_args.length).map(a => a.name)
      const partial_pos_args_names_formatted = `[${partial_pos_args_names.join('], [')}]`
      return make_ret(false, `Got too few positional args. Expected \`${this.pos_args.length}\`: \`${pos_args_names}\`, but only got \`${partial_pos_args_names.length}\`:\`${partial_pos_args_names_formatted}\``)
    }

    for (const [ii, pos_arg] of pos_args.entries()) {
      const { success, reply_msg, value } = this.pos_args[ii].validate(pos_arg)
      if (!success) {
        return { success, reply_msg }
      }
      pos_args[ii] = value
    }

    let non_pos_args = this._strip_pos_args(cmd_line_args)
    non_pos_args = this._replace_alias_with_name(non_pos_args)

    const unknown_args = this._find_unknown_args(non_pos_args)
    if (unknown_args.length > 0) {
      const unknown_arg_names = `[${unknown_args.join('], [')}]`
      return make_ret(false, `The following unknown args received: \`${unknown_arg_names}\``)
    }

    const missing_required_args = this._find_missing_required_args(non_pos_args)
    if (missing_required_args.length > 0) {
      return make_ret(false, `The following required args are missing:\n${code_block(`- ${missing_required_args.join('\n- ')}`)}`)
    }

    const missing_optional_args_defaults = this._find_missing_optional_args(non_pos_args)
    non_pos_args = non_pos_args.concat(missing_optional_args_defaults)

    for (let [name, _value] of non_pos_args) {
      const { success, reply_msg, value } = this.args.find(a => a.name === name).validate(_value)
      if (!success) {
        return { success, reply_msg }
      }
      const ii = non_pos_args.findIndex(([n, v]) => n === name)
      non_pos_args[ii][1] = value
    }

    return make_ret(true, null, null, { cmd_line_args: Object.fromEntries(non_pos_args.concat([["_", pos_args]])) })
  }

  full_name = () => {
    return this.alias !== null ? `${this.name}, ${this.alias}` : `${this.name}`
  }

  format_help = () => {
    return `${this.name}${this?.alias ? `, ${this.alias}` : ''} - ${this.help}`
  }

  format_detailed_help = () => {
    const pa = this.pos_args
    const ra = this.args.filter(a => !a.is_optional() && !a.hidden)
    const oa = this.args.filter(a => a.is_optional() && !a.hidden)

    const pos_args_help = `**Positional Args**\n${code_block(pa.map(a => a.format_help()).join('\n'))}`
    const req_args_help = `**Required Args**\n${code_block(ra.map(a => a.format_help()).join('\n'))}`
    const opt_args_help = `**Optional Args**\n${code_block(oa.map(a => a.format_help()).join('\n'))}`

    const pos_summary = pa.length === 0 ? '' : `${pa.map(a => `<${a.name}>`).join(' ')}`
    const req_summary = ra.length === 0 ? '' : `${ra.map(a => `--${a.name} <${a.name}>`).join(' ')}`
    const opt_summary = oa.length === 0 ? '' : `[${oa.map(a => `--${a.name} <${a.name}>`).join('], [')}]`

    const usage = `**Usage**\n${code_block(`${this.name} ${pos_summary} ${req_summary} ${opt_summary}`)}`

    return `${cyan_block(`${this.full_name()} - ${this.help}`)}\n${usage}\n${pos_args_help}\n${req_args_help}\n${opt_args_help}`
  }

  _strip_pos_args = (cmd_line_args) => {
    return Object.entries(cmd_line_args).filter(([k, v]) => k !== "_")
  }

  _replace_alias_with_name = (cmd_line_args) => {
    return cmd_line_args.map(([k, v]) => {
      const arg = this.args.find(r => r.is(k))
      if (arg?.alias === k) {
        return [arg.name, v]
      }
      return [k, v]
    })
  }

  _find_unknown_args = (cmd_line_args) => {
    return cmd_line_args.filter(([k, v]) => !(this.args.some(a => a.is(k)))).map(([k, v]) => k)
  }

  _find_missing_required_args = (cmd_line_args) => {
    const required_args = cmd_line_args.filter(([k, v]) => this.args.some(a => a.is(k) && !a.is_optional()))
    const missing_args = this.args.filter(arg => {
      return !(arg.is_optional() || required_args.some(([k, v]) => { return arg.is(k) }))
    })
    return missing_args.map(a => a.name)
  }

  _find_missing_optional_args = (cmd_line_args) => {
    const optional_args = cmd_line_args.filter(([k, v]) => this.args.some(a => a.is(k) && a.is_optional()))
    const missing_args = this.args.filter(arg => {
      return arg.is_optional() && !optional_args.some(([k, v]) => { return arg.is(k) })
    })
    return missing_args.map(a => [a.name, a.default_value])
  }
}