import { Arg } from "../src/utils/Arg.js"
import { cyan_block, code_block } from "../src/utils/DiscordFormat.js"
import { make_ret } from "../src/utils/Return.js"
import { is_alphanumeric } from "../src/utils/String.js"

describe('Arg Tests', () => {
  test("Arg Construct Test", () => {
    expect(() => new Arg({ name: 'arg1', type: 'invalid' })).toThrowError() // bad type
    expect(() => new Arg({ name: 'arg1', type: '' })).toThrowError() // no type
    expect(() => new Arg({ name: 'arg1', })).toThrowError() // no type

    expect(() => new Arg({ name: 'arg1', type: 'string', range: { min: 0, max: 5 } })).toThrowError() // range only valid with number
    expect(() => new Arg({ name: 'arg1', type: 'boolean', range: { min: 0, max: 5 } })).toThrowError() // range only valid with number
    expect(() => new Arg({ name: 'arg1', type: 'enum', range: { min: 0, max: 5 } })).toThrowError() // range only valid with number

    expect(() => new Arg({ name: 'arg1', type: 'string', choices: [1, 2, 3, 4] })).toThrowError() // choices only valid with enum
    expect(() => new Arg({ name: 'arg1', type: 'number', choices: [1, 2, 3, 4] })).toThrowError() // choices only valid with enum
    expect(() => new Arg({ name: 'arg1', type: 'boolean', choices: [1, 2, 3, 4] })).toThrowError() // choices only valid with enum

    expect(() => new Arg({ name: 'help', type: 'boolean' })).toThrowError() // arg can't be named help / h
    expect(() => new Arg({ name: 'h', type: 'boolean' })).toThrowError() // arg can't be named help / h
    expect(() => new Arg({ name: 'arg1', alias: 'help', type: 'boolean' })).toThrowError() // arg can't be named help / h
    expect(() => new Arg({ name: 'arg1', alias: 'h', type: 'boolean' })).toThrowError() // arg can't be named help / h
  })

  test("Arg Is IsOptional Test", () => {
    expect(new Arg({ name: 'arg1', type: 'boolean' }).is_optional()).toBe(false)
    expect(new Arg({ name: 'arg1', type: 'boolean', default_value: true }).is_optional()).toBe(true)

    expect(new Arg({ name: 'arg1', alias: 'a', type: 'boolean', default_value: true }).is('arg1')).toBe(true)
    expect(new Arg({ name: 'arg1', alias: 'a', type: 'boolean', default_value: true }).is('a')).toBe(true)
    expect(new Arg({ name: 'arg1', alias: 'a', type: 'boolean', default_value: true }).is('badname')).toBe(false)

    expect(new Arg({ name: 'arg1', alias: 'a', type: 'boolean' }).validate(1).success).toBe(false)
    expect(new Arg({ name: 'arg1', alias: 'a', type: 'boolean' }).validate('shouldbebool').success).toBe(false)
    expect(new Arg({ name: 'arg1', alias: 'a', type: 'boolean' }).validate(false).success).toBe(true)

  })

  test("Arg Validate Test", () => {
    expect(new Arg({ name: 'arg1', alias: 'a', type: 'number' }).validate('shouldbenumber').success).toBe(false)
    expect(new Arg({ name: 'arg1', alias: 'a', type: 'number' }).validate(false).success).toBe(false)
    expect(new Arg({ name: 'arg1', alias: 'a', type: 'number' }).validate(3.45).success).toBe(true)
    expect(new Arg({ name: 'arg1', alias: 'a', type: 'number' }).validate(5).success).toBe(true)
    expect(new Arg({ name: 'arg1', alias: 'a', type: 'number' }).validate(0).success).toBe(true)
    expect(new Arg({ name: 'arg1', alias: 'a', type: 'number' }).validate(-34.1).success).toBe(true)

    expect(new Arg({ name: 'arg1', alias: 'a', type: 'number', range: { min: 0, max: 5 } }).validate(-1).success).toBe(false)
    expect(new Arg({ name: 'arg1', alias: 'a', type: 'number', range: { min: 0, max: 5 } }).validate(6).success).toBe(false)
    expect(new Arg({ name: 'arg1', alias: 'a', type: 'number', range: { min: 0, max: 5 } }).validate(0).success).toBe(true)
    expect(new Arg({ name: 'arg1', alias: 'a', type: 'number', range: { min: 0, max: 5 } }).validate(5).success).toBe(true)

    expect(new Arg({ name: 'arg1', alias: 'a', type: 'number', range: { min: 0 } }).validate(-1).success).toBe(false)
    expect(new Arg({ name: 'arg1', alias: 'a', type: 'number', range: { min: 0 } }).validate(0).success).toBe(true)
    expect(new Arg({ name: 'arg1', alias: 'a', type: 'number', range: { min: 0 } }).validate(34251).success).toBe(true)

    expect(new Arg({ name: 'arg1', alias: 'a', type: 'number', range: { max: 5 } }).validate(6).success).toBe(false)
    expect(new Arg({ name: 'arg1', alias: 'a', type: 'number', range: { max: 5 } }).validate(-34234).success).toBe(true)
    expect(new Arg({ name: 'arg1', alias: 'a', type: 'number', range: { max: 5 } }).validate(5).success).toBe(true)

    expect(new Arg({ name: 'arg1', alias: 'a', type: 'enum', choices: [1, 2, 3, 4] }).validate(5).success).toBe(false)
    expect(new Arg({ name: 'arg1', alias: 'a', type: 'enum', choices: [1, 2, 3, 4] }).validate(0).success).toBe(false)
    expect(new Arg({ name: 'arg1', alias: 'a', type: 'enum', choices: [1, 2, 3, 4] }).validate('1').success).toBe(false)
    expect(new Arg({ name: 'arg1', alias: 'a', type: 'enum', choices: [1, 2, 3, 4] }).validate(true).success).toBe(false)
    expect(new Arg({ name: 'arg1', alias: 'a', type: 'enum', choices: [1, 2, 3, 4] }).validate(2).success).toBe(true)

    expect(new Arg({ name: 'arg1', alias: 'a', type: 'enum', choices: ['a', 'b'] }).validate('c').success).toBe(false)
    expect(new Arg({ name: 'arg1', alias: 'a', type: 'enum', choices: ['a', 'b'] }).validate('a').success).toBe(true)

    expect(new Arg({ name: 'arg1', alias: 'a', type: 'number', validator: (a) => a < 5 ? make_ret(true) : make_ret(false, `value must be less than 5`) }).validate(6).success).toBe(false)
    expect(new Arg({ name: 'arg1', alias: 'a', type: 'number', validator: (a) => a < 5 ? make_ret(true) : make_ret(false, `value must be less than 5`) }).validate(5).success).toBe(false)
    expect(new Arg({ name: 'arg1', alias: 'a', type: 'number', validator: (a) => a < 5 ? make_ret(true) : make_ret(false, `value must be less than 5`) }).validate(4).success).toBe(true)
  })
})