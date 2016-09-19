'use strict'

const assert = require('assert')
const SwaggerParameters = require('swagger-parameters')
const url = require('url')
const Ajv = require('ajv')
const extend = require('xtend')
const map = require('map-obj')
const safeJson = require('safe-json-parse/callback')
const TypedError = require('error/typed')

module.exports = Validate

function Validate (swagger, options) {
  const ajv = new Ajv({
    coerceTypes: true,
    jsonPointers: true,
    useDefaults: true,
    verbose: options.verbose
  })

  assert(options.path, 'path is required')
  assert(options.route, 'route is required')

  const route = options.route

  assert(route.responses, `missing responses in ${options.path}`)

  return {
    parameters: Parameters(route.parameters, {parameters: swagger.parameters}),
    body: Body(route.parameters, swagger.definitions, ajv),
    response: Response(route.responses, swagger.definitions, ajv)
  }
}

function Parameters (parameters, data) {
  const parse = SwaggerParameters(parameters, data)

  return function validateParameters (req, pathParams, callback) {
    parse({
      path: pathParams,
      query: url.parse(req.url, true).query,
      headers: req.headers
    }, onValidate)

    function onValidate (err, data) {
      if (err) return callback(createError(ValidationError, err.errors, null, 'parameters'))
      Object.assign(req, {
        params: data.path,
        query: data.query,
        headers: data.headers
      })
      callback()
    }
  }
}

function Body (parameters, definitions, ajv) {
  const parameter = (parameters || []).find((p) => p.in === 'body')
  if (!parameter) return (req, callback) => callback()

  const validate = ajv.compile(extend(parameter.schema, {definitions}))

  return function validateBody (req, callback) {
    const valid = validate(req.body)
    if (!valid) return callback(createError(ValidationError, validate.errors, req.body, 'body'))
    callback()
  }
}

function Response (responses, definitions, ajv) {
  const validators = map(responses, function (code, response) {
    if (!response.schema || response.schema.type === 'file') {
      return [code, true]
    }

    return [code, ajv.compile(extend(response.schema, {definitions}))]
  })

  return function validateResponse (res, data, callback) {
    const validate = validators[res.statusCode] || validators.default

    if (!validate && res.statusCode < 500) {
      return callback(StatusError({
        status: res.statusCode
      }))
    }

    if (validate === true) {
      return callback()
    }

    safeJson(data, function (err, data) {
      if (err) return callback(err)
      const valid = validate ? validate(data) : true
      if (!valid) return callback(createError(ResponseError, validate.errors, data, 'response'))
      callback()
    })
  }
}

const ValidationError = TypedError({
  type: 'request.validation',
  statusCode: 400,
  message: 'Invalid data in {source}: {cause}',
  cause: null,
  source: null,
  schema: null
})

const ResponseError = TypedError({
  type: 'response.validation',
  statusCode: 500,
  message: 'Invalid data in {source}: {cause}',
  cause: null,
  source: null,
  schema: null
})

const StatusError = TypedError({
  type: 'response.status',
  message: 'Unexpected response status: {status}',
  status: null
})

function createError (Ctor, errors, data, source) {
  return Ctor({
    source: source,
    cause: errors.map((e) => `${e.dataPath} ${e.message}`).join(', '),
    errors: errors
  })
}
