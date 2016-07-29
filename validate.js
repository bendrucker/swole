'use strict'

const Ajv = require('ajv')
const extend = require('xtend')
const map = require('map-obj')
const TypedError = require('error/typed')

module.exports = Validate

function Validate (swagger, path, method, route) {
  const ajv = new Ajv({coerceTypes: true})

  return {
    parameters: Parameters(path, method, route.parameters, ajv),
    body: Body(route.parameters, swagger.definitions, ajv),
    response: Response(route.responses, swagger.definitions, ajv)
  }
}

function Parameters (path, method, parameters, ajv) {
  if (!parameters) return (req, params, callback) => callback()

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
    if (!valid) return callback(createError(ValidationError, validate.errors, 'parameters'))
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
    if (!valid) return callback(createError(ValidationError, validate.errors, 'body'))
    callback()
  }
}

function Response (responses, definitions, ajv) {
  const validators = map(responses, function (code, response) {
    return [code, ajv.compile(extend(response.schema, {definitions}))]
  })

  return function validateResponse (res, data, callback) {
    const validate = validators[res.statusCode] || validators.default
    if (!validate) {
      return callback(StatusError({
        status: res.statusCode
      }))
    }

    const valid = validate(data)
    if (!valid) return callback(createError(ResponseError, validate.errors, 'response'))
    callback()
  }
}

const ValidationError = TypedError({
  type: 'request.validation',
  statusCode: 400,
  message: 'Invalid data in {source}: {cause}',
  cause: null,
  source: null
})

const ResponseError = TypedError({
  type: 'response.validation',
  statusCode: 500,
  message: 'Invalid data in {source}: {cause}',
  cause: null,
  source: null
})

const StatusError = TypedError({
  type: 'response.status',
  message: 'Unexpected response status: {status}',
  status: null
})

function createError (Ctor, errors, source) {
  return Ctor({
    source: source,
    cause: errors.map((e) => `${e.dataPath.replace(/^\./, '')} ${e.message}`).join(', ')
  })
}
