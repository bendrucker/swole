'use strict'

const extend = require('xtend')
const Router = require('http-hash-router')
const map = require('map-obj')
const assert = require('assert')
const partial = require('ap').partial
const series = require('run-series')
const unary = require('fn-unary')
const join = require('url-join')
const url = require('url')

const body = require('body-parser')

const Validate = require('./validate')
const response = require('./response')

module.exports = Swole

function Swole (swagger, options) {
  options = extend({lowercase: true}, options)

  const router = Router()
  createRoutes(router, swagger, options)

  return function swole (req, res, callback) {
    if (options.lowercase) {
      req.url = lowercasePath(req.url)
    }

    router(req, res, {}, unary(callback))
  }
}

function createRoutes (router, swagger, options) {
  const json = body.json()

  Object.keys(swagger.paths).forEach(function (path) {
    const route = swagger.paths[path]
    const base = swagger.basePath || ''
    router.set(join(base, createPath(path, options)), map(route, (method, data) => [
      method.toUpperCase(),
      Route(path, method, data)
    ]))
  })

  function Route (path, method, data) {
    const validate = Validate(swagger, {
      path: path,
      route: data,
      verbose: options.strict
    })

    const handlerKey = data['x-handler']
    const handler = options.handlers[handlerKey]

    assert.equal(typeof handler, 'function', `invalid x-handler for ${path}: ${handlerKey} (${handler})`)

    return function handle (req, res, data, callback) {
      series([
        partial(validate.parameters, req, data.params),
        partial(json, req, res),
        partial(validate.body, req),
        partial(handler, req, response.wrap(req, res, options.strict && validate.response))
      ], callback)
    }
  }
}

// /foo/barBaz/qux?beepBoop=1 => /foo/barbaz/qux?beepBoop=1
function lowercasePath (path) {
  const parsed = url.parse(path)
  return parsed.pathname.toLowerCase() + (parsed.search || '')
}

// /{foo}/barBaz/{qux} => /:foo/barbaz/:qux
function createPath (path, options) {
  return path
    .split('/')
    .map(function (segment) {
      return segment
        .replace(/^([A-Za-z0-9]+)$/, (string, match) => options.lowercase ? match.toLowerCase() : match)
        .replace(/{([A-Za-z0-9]+)}/, (string, match) => ':' + match)
    })
    .join('/')
}
