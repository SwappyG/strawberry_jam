import { make_ret } from "./Return"

export class Command {
  constructor({ name, func, help, pos_args, args, alias }) {
    this.name = name
    this.alias = alias ?? null
    this.help = help ?? 'Help is not documented for this command'
    this.func = func
    this.pos_args = pos_args
    this.args = args

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
    if (pos_args.length !== this.pos_args.length) {
      const pos_args_names = `[${this.pos_args.map(a => a.name).join('], [')}]`
      const partial_pos_args_names = `[${this.pos_args.slice(0, pos_args.length).map(a => a.name).join('], [')}]`
      return make_ret(false, `Expected positional args \`${pos_args_names}\` but only got \`${partial_pos_args_names}\``)
    }

    for (const [ii, pos_arg] of pos_args.entries()) {
      const { success, reply_msg } = this.pos_args[ii].validate(pos_arg)
      if (!success) {
        return { success, reply_msg }
      }
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
      return make_ret(false, `The following required args are missing:\n${code_block(`- ${missing_args.join('\n- ')}`)}`)
    }

    const missing_optional_args_defaults = this._find_missing_optional_args(non_pos_args)
    non_pos_args = non_pos_args.concat(missing_optional_args_defaults)

    for (let [name, value] of non_pos_args) {
      const { success, reply_msg } = this.args.find(a => a.name === name).validate(value)
      if (!success) {
        return { success, reply_msg }
      }
    }

    return make_ret(true, null, null, { cmd_line_args: Object.fromEntries(non_pos_args.concat([["_", pos_args]])) })
  }

  format_help = () => {
    return `${this.name}${this?.alias ? `, ${this.alias}` : ''} - ${this.help}`
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