'use strict'

const Router = require('http-hash-router')
const map = require('map-obj')
const partial = require('ap').partial
const series = require('run-series')
const unary = require('fn-unary')

const body = require('body-parser')

const Validate = require('./validate')
const response = require('./response')

module.exports = Swole

function Swole (swagger, options) {
  const router = Router()
  createRoutes(router, swagger, options)

  return function swole (req, res, callback) {
    router(req, res, {}, unary(callback))
  }
}

function createRoutes (router, swagger, options) {
  const json = body.json()

  Object.keys(swagger.paths).forEach(function (path) {
    const route = swagger.paths[path]
    router.set(toColon(path), map(route, (method, data) => [
      method.toUpperCase(),
      Route(path, method, data)
    ]))
  })

  function Route (path, method, data) {
    const validate = Validate(path, method, data)
    const handler = options.handlers[data['x-handler']]

    return function handle (req, res, data, callback) {
      series([
        partial(validate.parameters, req, data.params),
        partial(json, req, res),
        partial(validate.body, req),
        partial(handler, req, response.wrap(options.strict && validate.response, res))
      ], callback)
    }
  }
}

function params (req, options, callback) {
  req.params = {}
}

// /{foo}/bar/{baz} => /:foo/bar/:baz
function toColon (path) {
  return path.replace(/{(.*?)}/g, (string, match) => ':' + match)
}
