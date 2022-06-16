import { Arg } from "../src/utils/Arg.js"
import { Command } from "../src/utils/Command.js"
import { make_ret } from "../src/utils/Return.js"


describe('Commands Tests', () => {
  test("Command Args Test", () => {

    const arg_pos1 = new Arg({ name: 'pos1', type: 'string' })
    const arg_pos2 = new Arg({ name: 'pos2', type: 'string' })

    const arg_req1 = new Arg({ name: 'req1', alias: 'r', type: 'string' })
    const arg_opt1 = new Arg({ name: 'opt1', alias: 'o', type: 'string', validator: (v) => make_ret(v.length === 7, 'opt1 must be 7 characters'), default_value: 'default' })

    let call_count = 0
    const func = (a) => call_count++

    const cmd = new Command({
      name: 'alpha',
      alias: 'a',
      func: func,
      pos_args: [arg_pos1, arg_pos2],
      args: [arg_req1, arg_opt1]
    })

    expect(cmd.is('alpha')).toBe(true)
    expect(cmd.is('a')).toBe(true)
    expect(cmd.is('wrong')).toBe(false)

    {
      const { success, cmd_line_args } = cmd.validate_and_cleanup({ "_": [], req1: "some_str" }).success
      expect(cmd.validate_and_cleanup({ "_": [], req1: "some_str" }).success).toBe(false) // missing pos args
    }
    {
      const { success, cmd_line_args } = cmd.validate_and_cleanup({ "_": ['val1'], req1: "some_str" })
      expect(cmd.validate_and_cleanup({ "_": ['alpha', 'val1'], req1: "some_str" }).success).toBe(false) // missing pos arg 2
    }
    {
      // const { success, cmd_line_args } = cmd.validate_and_cleanup({ "_": ['val1', 'val2', 'val3'], req1: "some_str" })
      expect(cmd.validate_and_cleanup({ "_": ['alpha', 'val1', 'val2', 'val3'], req1: "some_str" }).success).toBe(false) // too many pos args
    }
    {
      const { success, cmd_line_args } = cmd.validate_and_cleanup({ "_": ['val1', 5], req1: "some_str" })
      expect(cmd.validate_and_cleanup({ "_": ['alpha', 'val1', 5], req1: "some_str" }).success).toBe(false) // pos arg 2 type is wrong
    }
    {
      const { success, cmd_line_args } = cmd.validate_and_cleanup({ "_": ['val1', 'val2'], req1: 5 })
      expect(cmd.validate_and_cleanup({ "_": ['alpha', 'val1', 'val2'], req1: 5 }).success).toBe(false) // req arg type is wrong
    }
    {
      const { success, cmd_line_args } = cmd.validate_and_cleanup({ "_": [], req1: "some_str", badarg: 'bad' })
      expect(cmd.validate_and_cleanup({ "_": ['alpha', 'val1', 'val2'], req1: "some_str", badarg: 'bad' }).success).toBe(false) // unknown arg
    }
    {
      const { success, cmd_line_args } = cmd.validate_and_cleanup({ "_": ['val1', 'val2'], req1: 5 })
      expect(cmd.validate_and_cleanup({ "_": ['alpha', 'val1', 'val2'], req1: 'some_str', opt1: 5 }).success).toBe(false) // opt arg type is wrong
    }
    {
      const { success, cmd_line_args } = cmd.validate_and_cleanup({ "_": ['val1', 'val2'], req1: 5 })
      expect(cmd.validate_and_cleanup({ "_": ['alpha', 'val1', 'val2'], req1: 'some_str', opt1: 'too many letters' }).success).toBe(false) // opt arg validator rejection
    }
    {
      const { success, reply_msg, cmd_line_args } = cmd.validate_and_cleanup({ "_": ['alpha', 'val1', 'val2'], req1: "some_str" })
      expect(success).toBe(true)
      expect(cmd_line_args.opt1).toStrictEqual('default')
      expect(cmd_line_args.req1).toStrictEqual('some_str')
      expect(cmd_line_args._).toStrictEqual(['val1', 'val2'])
    }
  })
})