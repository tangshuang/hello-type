import Type from './type'
import { isFunction, isInstanceOf, isNumber, isString } from './utils'
import { xError, HelloTypeError } from './error'

export default class Rule {
  constructor(...args) {
    if (args.length > 1) {
      this.name = args[0]
      this.vaildate = args[1]
      this.override = args[2]
    }
    else if (args.length > 0) {
      this.vaildate = args[0]
    }
    if (!isFunction(this.vaildate)) {
      this.vaildate = () => null
    }
    if (this.override && !isFunction(this.override)) {
      this.override = () => undefined
    }
  }
  toString() {
    return this.name || 'Rule'
  }
}

export const Null = new Rule('Null', function(value) {
  if (value !== null) {
    return new HelloTypeError('rule.null', { target: value, type: this })
  }
})
export const Undefined = new Rule('Undefined', function(value) {
  if (value !== undefined) {
    return new HelloTypeError('rule.undefined', { target: value, type: this })
  }
})
export const Any = new Rule('Any', () => null)
export const Numeric = new Rule('Numeric', function(value) {
  if (!isNumber(value) && !(isString(value) && /^[0-9]+(\.{0,1}[0-9]+){0,1}$/.test(value))) {
    return new HelloTypeError('rule.numeric', { target: value, type: this })
  }
})

/**
 * Verify a rule by using custom error message
 * @param {Rule|Function} rule
 * @param {String|Function} message
 */
export function Validate(rule, message) {
  if (isFunction(rule)) {
    return new Rule('Verify', function(value) {
      if (!rule(value)) {
        let msg = isFunction(message) ? message(value) : message
        return new HelloTypeError(msg, { target: value, rule, type: this })
      }
    })
  }

  if (isInstanceOf(rule, Rule)) {
    return new Rule('Verify', function(value) {
      if (rule.vaildate(value)) {
        let msg = isFunction(message) ? message(value) : message
        return new HelloTypeError(msg, { target: value, rule, type: this })
      }
    })
  }

  if (isInstanceOf(rule, Type)) {
    return new Rule('Verify', function(value) {
      if (!rule.test(value)) {
        let msg = isFunction(message) ? message(value) : message
        return new HelloTypeError(msg, { target: value, rule, type: this })
      }
    })
  }

  let type = new Type(rule)
  return Validate(type, message)
}

/**
 * If the value exists, use rule to vaildate.
 * If not exists, ignore this rule.
 * @param {*} rule
 */
export function IfExists(rule) {
  if (isInstanceOf(rule, Rule)) {
    return new Rule('IfExists', function(value) {
      if (value === undefined) {
        return null
      }
      let error = rule.vaildate(value)
      return xError(error, { target: value, rule, type: this })
    })
  }

  if (isInstanceOf(rule, Type)) {
    return new Rule('IfExists', function(value) {
      if (value === undefined) {
        return null
      }
      let error = rule.catch(value)
      return xError(error, { target: value, rule, type: this })
    })
  }

  let type = new Type(rule)
  return IfExists(type)
}

/**
 * If the value not match rule, use defaultValue as value.
 * Notice, this will modify original data, which may cause error, so be careful.
 * @param {*} rule
 * @param {*} defaultValue
 */
export function IfNotMatch(rule, defaultValue) {
  if (isInstanceOf(rule, Rule)) {
    return new Rule('IfNotMatch', function(value) {
      let error = rule.vaildate(value)
      return xError(error, { target: value, rule, type: this })
    }, function(error, prop, target) {
      if (error) {
        target[prop] = defaultValue
      }
    })
  }

  if (isInstanceOf(rule, Type)) {
    return new Rule('IfNotMatch', function(value) {
      let error = rule.catch(value)
      return xError(error, { target: value, rule, type: this })
    }, function(error, prop, target) {
      if (error) {
        target[prop] = defaultValue
      }
    })
  }

  let type = new Type(rule)
  return IfNotMatch(type, defaultValue)
}

/**
 * determine which rule to use.
 * @param {function} factory a function to receive parent node of current prop, and return a rule
 * @example
 * const SomeType = Dict({
 *   name: String,
 *   isMale: Boolean,
 *   // data type check based on person.isMale
 *   touch: Determine(function(person) {
 *     if (person.isMale) {
 *       return String
 *     }
 *     else {
 *       return Null
 *     }
 *   }),
 * })
 */
export function Determine(factory) {
  let rule
  let isMade = false
  return new Rule('Determine', function(value) {
    if (!isMade) {
      return new HelloTypeError('You should pass a rule to Determine.', { target: value, type: this })
    }
    if (isInstanceOf(rule, Rule)) {
      let error = rule.vaildate(value)
      return xError(error, { target: value, rule, type: this })
    }
    else if (isInstanceOf(rule, Type)) {
      let error = rule.catch(value)
      return xError(error, { target: value, rule, type: this })
    }
    else {
      rule = new Type(rule)
      let error = rule.catch(value)
      return xError(error, { target: value, rule, type: this })
    }
  }, function(error, porp, target) {
    rule = factory(target)
    isMade = true
  })
}

/**
 * If the value exists, and if the value not match rule, use defaultValue as value.
 * If not exists, ignore this rule.
 * @param {*} rule
 * @param {*} defaultValue
 */
export function IfExistsNotMatch(rule, defaultValue) {
  if (isInstanceOf(rule, Rule)) {
    return new Rule('IfExistsNotMatch', function(value) {
      if (value === undefined) {
        return null
      }
      let error = rule.vaildate(value)
      return xError(error, { target: value, rule, type: this })
    }, function(error, prop, target) {
      if (error) {
        target[prop] = defaultValue
      }
    })
  }

  if (isInstanceOf(rule, Type)) {
    return new Rule('IfExistsNotMatch', function(value) {
      if (value === undefined) {
        return null
      }
      let error = rule.catch(value)
      return xError(error, { target: value, rule, type: this })
    }, function(error, prop, target) {
      if (error) {
        target[prop] = defaultValue
      }
    })
  }

  let type = new Type(rule)
  return IfExistsNotMatch(type, defaultValue)
}

/**
 * Whether the value is an instance of given class
 * @param {*} rule should be a class constructor
 */
export function InstanceOf(rule) {
  return new Rule('InstanceOf', function(value) {
    if (!isInstanceOf(value, rule, true)) {
      return new HelloTypeError('rule.instanceof', { target: value, rule, type: this })
    }
  })
}

/**
 * Whether the value is eqaul to the given value
 * @param {*} rule
 */
export function Equal(rule) {
  return new Rule('Equal', function(value) {
    if (value !== rule) {
      return new HelloTypeError('rule.equal', { target: value, rule, type: this })
    }
  })
}

export function Lambda(InputRule, OutputRule) {
  return new Rule('Lambda', function(value) {
    if (!isFunction(value)) {
      return new HelloTypeError('rule.lambda.function', { target: value, type: this })
    }
  }, function(error, prop, target) {
    if (!error) {
      let fn = target[prop].bind(target)
      let InputType = new Type(InputRule)
      let OutputType = new Type(OutputRule)
      let lambda = function(...args) {
        InputType.assert(...args)
        let result = fn.call(this, ...args)
        OutputType.assert(result)
        return result
      }
      target[prop] = lambda
    }
  })
}
