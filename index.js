'use strict'

const Router = require('http-hash-router')
const Validate = require('./validate')
const response = require('./response')

module.exports = Swole

function Swole (swagger) {
  const router = Router()
  createRoutes(router, swagger)

  return function swole (req, res, callback) {
    router(req, res, {}, callback)
  }
}

function createRoutes (router, options) {
  const json = body.json()
  map(swagger.paths, function (route, path) {
    router.set(toColon(path), map(route, Route))
  })

  function Route (data, method) {
    const validate = Validate(data)
    const handler = data['x-handler']

    return function handle (req, res, callback) {
      serial([
        partial(validate.params, req),
        partial(json, req, res),
        partial(validate.body, req),
        partial(handler, req, response.wrap(options.strict && validate.response, res))
      ], callback)
    }
  }
}

// /{foo}/bar/{baz} => /:foo/bar/:baz
function toColon (path) {
  return path.replace(/{(.*?)}/g, (string, match) => ':' + match)
}
