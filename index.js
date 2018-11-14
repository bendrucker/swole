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
  options = extend({ lowercase: true, accepts: ['json'] }, options)

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
  const parse = createParser(options.accepts)

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
      verbose: options.strict,
      deprecate: options.strict
    })

    const handlerKey = data['x-handler']
    const handler = options.handlers[handlerKey]

    assert.strictEqual(typeof handler, 'function', `invalid x-handler for ${path}: ${handlerKey} (${handler})`)

    return function handle (req, res, route, callback) {
      series([
        partial(identify, req, path, data),
        partial(validate.deprecated, req, res),
        partial(validate.parameters, req, route.params),
        partial(parse, req, res),
        partial(validate.body, req),
        partial(hooks, options.hooks, req, res),
        partial(handler, req, response.wrap(req, res, options.strict && validate.response))
      ], callback)
    }
  }
}

function identify (req, path, operation, callback) {
  req.swole = { path, operation }
  callback()
}

function createParser (parsers) {
  const middlewares = parsers.map(function (key) {
    var options = {}
    if (Array.isArray(key)) {
      options = key[1]
      key = key[0]
    }

    const fn = body[key]

    assert(fn, 'invalid "accepts" value: ' + key)

    return fn(options)
  })

  return function parse (req, res, callback) {
    series(
      middlewares.map((fn) => partial(fn, req, res)),
      callback
    )
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
        .replace(/{([A-Za-z0-9_-]+)}/, (string, match) => ':' + match)
    })
    .join('/')
}

function hooks (fns, req, res, callback) {
  if (!fns) return callback()

  series(
    fns.map((fn) => partial(fn, req, res)),
    callback
  )
}
