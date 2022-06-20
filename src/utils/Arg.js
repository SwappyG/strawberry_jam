import { make_ret } from "./Return.js"
import { code_block } from "./DiscordFormat.js"

const ARG_TYPES = ['number', 'string', 'boolean', 'enum', 'any']

export class Arg {
  constructor({ name, help, alias, type, default_value, range, int_only, choices, is_list, hidden, nullable, validator }) {
    this.name = name
    this.help = help ?? 'Help is not documented for this arg'
    this.alias = alias ?? null
    this.type = type
    this.range = range ?? null
    this.choices = choices ?? null
    this.hidden = hidden ?? false
    this.validator = validator ?? ((value) => {
      return make_ret(true)
    })
    this.default_value = default_value
    this.nullable = nullable ?? false
    this.is_list = is_list ?? false
    this.int_only = int_only ?? false // ignored if type not number

    if (!ARG_TYPES.includes(type)) {
      throw new Error(`Type ${type} is not valid.`)
    }

    if (this.type !== 'enum' && this.choices !== null) {
      throw new Error(`choices can only be provided if type is enum, not ${type}`)
    }

    if (this.type === 'enum' && this.choices === null) {
      throw new Error(`If the type is an enum, choices must be provided`)
    }

    if (this.type !== 'number' && this.range !== null) {
      throw new Error(`range can only be provided if type is number, not ${type}`)
    }

    if (['help', 'h'].includes(this.name.toLowerCase())) {
      throw new Error('An arg cannot be named \`help\` or \`h\`')
    }

    if (['help', 'h'].includes(this.alias?.toLowerCase())) {
      throw new Error(`An arg's alias cannot be named \`help\` or \`h\``)
    }
  }

  is = (name) => {
    return name === this.name || name === this.alias
  }

  _get_validate_func = () => {
    switch (this.type) {
      case 'number': return this._validate_number
      case 'boolean': return this._validate_boolean
      case 'string': return this._validate_string
      case 'enum': return this._validate_enum
    }
  }

  _validate_boolean = (value) => {
    if (typeof value === 'boolean') {
      return make_ret(true, null, null, { value: value })
    }

    if (typeof value === 'string') {
      value = value.toLowerCase()
    }

    if (['t', '1', 'true', 'yes', 'y', 1].includes(value)) {
      return make_ret(true, null, null, { value: true })
    }

    if (['f', 'false', 'no', 'n', '0', 0].includes(value)) {
      return make_ret(true, null, null, { value: false })
    }
    return make_ret(false, `Expected \`${this.name}\` to be given ${this.is_list ? 'list of booleans' : 'a boolean'}, \`${value}\` was not a boolean.`)
  }

  _validate_number = (value) => {
    let v_parsed = value
    if (typeof value !== 'number') {
      // check for invalid symbols in number
      if (value.split("").some(a => ` !@#$%^&*()_={}[];:"'<,>?/`.includes(a))) {
        return make_ret(false, `found invalid characters in argument`)
      }
    }

    // if int_only, make sure number isn't a float
    const v_int = parseInt(value)
    v_parsed = parseFloat(value)
    if (this.int_only && v_int !== v_parsed) {
      return make_ret(false, `Arg \`${this.name}\` expects only integer, received non-integer \`${value}\``)
    }

    if (isNaN(v_parsed)) {
      return make_ret(false, `Expected \`${this.name}\` to be given ${this.is_list ? 'list of numbers' : 'a number'}, \`${value}\` was not a number.`)
    }

    if (v_parsed < this.range?.min || v_parsed > this.range?.max) {
      return make_ret(false, `value for \`${this.name}\` is out of range`)
    }

    return make_ret(true, null, null, { value: v_parsed })
  }

  _validate_string = (value) => {
    if (typeof value !== 'string') {
      return make_ret(false, `Expected ${this.name} to be given ${this.is_list ? 'list of strings' : 'a string'}, ${value} was not a string.`)
    }
    return make_ret(true, null, null, { value: value })
  }

  _validate_enum = (value) => {
    if (!this.choices.includes(value)) {
      return make_ret(false, `Expected value for \`${this.name}\` to be from choices \`${this.choices}\``)
    }
    return make_ret(true, null, null, { value: value })
  }

  _validate_list = (value) => {
    if (typeof value !== 'string') {
      value = value.toString()
    }
    let val_array = value.split(",").map(a => a.trim())

    const validate_func = this._get_validate_func()
    const bad_values = val_array.reduce((accum, v, ii) => {
      const { success, reply_msg, ...rest } = validate_func(v)
      if (!success) {
        accum.push([v, reply_msg])
      }
      val_array[ii] = rest.value
      return accum
    }, [])
    if (bad_values.length > 0) {
      return make_ret(false, `Got bad values in list:\n\n${bad_values.map(([v, r]) => `\`${v}\`, reason: ${r}\n`)}`)
    }
    return make_ret(true, null, null, { value: val_array })
  }

  validate = (value) => {
    if (value === null) {
      return this.nullable ? make_ret(true) : make_ret(false, `Received \`null\` for non-nullable arg \`${this.name}\``)
    }

    const { success, ...rest } = (() => {
      if (this.is_list) {
        return this._validate_list(value)
      } else {
        return this._get_validate_func()(value)
      }
    })()
    if (!success) {
      return { success, ...rest }
    }

    value = rest.value
    try {
      const { success, ...rest } = this.validator(value)
      if (rest.value !== undefined) {
        return { success, ...rest }
      }
      return make_ret(success, rest.reply_msg, rest.dm_msg, { value: value })
    } catch (e) {
      throw new Error(`Arg \`${this.name}\` has a bad validator, it threw:${code_block(e.stack)}`)
    }
  }

  is_optional = () => {
    return this.default_value !== undefined
  }

  format_help = () => {
    return `${this.name}${this?.alias ? `, ${this.alias}` : ''} - ${this.help}`
  }
}