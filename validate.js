'use strict'

const Ajv = require('ajv')
const extend = require('xtend')

module.exports = Validate

function Validate (swagger, path, method, route) {
  const ajv = new Ajv({coerceTypes: true})

  return {
    parameters: Parameters(path, method, route.parameters, ajv),
    body: Body(route.parameters, swagger.definitions, ajv),
    response: response
  }

  function response (res, data, callback) {

  }
}

function Parameters (path, method, parameters, ajv) {
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

function Body (parameters, definitions, ajv) {
  const parameter = parameters.find((p) => p.in === 'body')
  if (!parameter) return (req, callback) => callback()

  const validate = ajv.compile(extend(parameter.schema, {definitions}))

  return function validateBody (req, callback) {
    const valid = validate(req.body)
    if (!valid) return callback(new Error(JSON.stringify(validate.errors)))
    callback()
  }
}
