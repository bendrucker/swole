'use strict'

const Ajv = require('ajv')
const ajv = new Ajv({coerceTypes: true})

module.exports = Validate

function Validate (path, method, route) {
  return {
    parameters: Parameters(path, method, route.parameters),
    body: body,
    response: response
  }

  function body (req, callback) {
    const parameter = route.parameters.find((p) => p.in === 'body')
    if (!parameter) return callback()
    const valid = ajv.validate(parameter, req.body)
    if (valid) return callback()
  }

  function response (res, data, callback) {

  }
}

function Parameters (path, method, parameters) {
  const validate = ajv.compile(parameters.reduce(function (acc, parameter) {
    if (parameter.in === 'body') return acc
    acc.properties[parameter.in].properties[parameter.name] = parameter
    return acc
  }, createSchemas(['header', 'query', 'path'], path, method)))

  return function validateParameters (req, pathParams, callback) {
    req.params = pathParams

    const parameters = {
      query: req.query,
      header: req.headers,
      path: req.params
    }

    const valid = validate(parameters)
    if (!valid) return callback(new Error(JSON.stringify(validate.errors)))
    callback()
  }
}

function createSchemas (keys, path, method) {
  return {
    title: 'HTTP parameters',
    description: 'HTTP header, path, and query parameters',
    type: 'object',
    properties: keys.reduce(function (acc, key) {
      return Object.assign(acc, {
        [key]: {
          title: 'HTTP ' + key,
          description: `HTTP ${key} parameters schema for '${method} ${path}'`,
          type: 'object',
          properties: {}
        }
      })
    }, {})
  }
}
