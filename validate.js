'use strict'

const Ajv = require('ajv')
const ajv = new Ajv({coerceTypes: true})

module.exports = Validate

function Validate (route) {
  return {
    params: params,
    body: body,
    response: response
  }

  function params (req, callback) {
    req.query = req.query || {}
    if (!route.parameters) return callback()

    const sources = {
      query: req.query,
      header: req.headers
    }

    return route.parameters.every(function (parameter) {
      if (parameter.in === 'body') return true

      const data = {
        [parameter.name] = sources[parameter.in][name]
      }
      const name = parameter.name[parameter.in === 'header' ? 'toLowerCase', 'toString']()

      const schema = {
        type: 'object',
        properties: {
          [parameter.name]: parameter
        }
      }
      const valid = ajv.validate(parameter, data)

      if (valid) {
        sources[name] = data[parameter.name]
        callback()
      }
      callback(new Error('invalid'))
      return false
    })
  }

  function body (req, callback) {
    const parameter = route.parameters.find((p) => p.in === 'body')
    if (!param) return callback()
    const valid = ajv.validate(parameter, req.body)
    if (valid) return callback()
  }

  function response (res, data, callback) {

  }
}
