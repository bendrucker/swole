'use strict'

const SwaggerParameters = require('swagger-parameters')
const url = require('url')
const Ajv = require('ajv')
const extend = require('xtend')
const map = require('map-obj')
const safeJson = require('safe-json-parse/callback')
const TypedError = require('error/typed')

module.exports = Validate

function Validate (swagger, path, method, route) {
  const ajv = new Ajv({coerceTypes: true})

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
      if (err) return callback(createError(ValidationError, err.errors, 'parameters'))
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

    safeJson(data, function (err, data) {
      if (err) return callback(err)
      const valid = validate(data)
      if (!valid) return callback(createError(ResponseError, validate.errors, 'response'))
      callback()
    })
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
    cause: errors.map((e) => `${e.dataPath.replace(/^\./, '')} ${e.message}`).join(', '),
    errors: errors
  })
}
