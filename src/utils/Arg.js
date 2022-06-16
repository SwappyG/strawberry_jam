import { make_ret } from "./Return.js"
import { code_block } from "./DiscordFormat.js"

const ARG_TYPES = ['number', 'string', 'boolean', 'enum']

export class Arg {
  constructor({ name, help, alias, type, default_value, range, choices, hidden, nullable, validator }) {
    this.name = name
    this.help = help ?? 'Help is not documented for this arg'
    this.alias = alias ?? null
    this.type = type
    this.range = range ?? null
    this.choices = choices ?? null
    this.hidden = hidden ?? false
    this.validator = validator ?? ((text) => make_ret(true))
    this.default_value = default_value
    this.nullable = nullable ?? false

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

  validate = (value) => {
    if (this.nullable && value === null) {
      return make_ret(true)
    }

    if (['number', 'boolean', 'string'].includes(this.type) && typeof value !== this.type) {
      return make_ret(false, `Expected value for \`${this.name}\` to be type \`${this.type}\`, got ${value}`)
    }

    if (this.type === 'enum' && !this.choices.includes(value)) {
      return make_ret(false, `Expected value for \`${this.name}\` to be from choices \`${this.choices}\``)
    }

    if (this.type === 'number' && (value < this.range?.min || value > this.range?.max)) {
      return make_ret(false, `value for \`${this.name}\` is out of range`)
    }

    try {
      const { success, ...rest } = this.validator(value)
      return { success, ...rest }
    } catch (e) {
      throw new Error(`Arg \`${this.name}\` has a bad validator, it threw:${code_block(e)}`)
    }
  }

  is_optional = () => {
    return this.default_value !== undefined
  }

  format_help = () => {
    return `${this.name}${this?.alias ? `, ${this.alias}` : ''} - ${this.help}`
  }
}