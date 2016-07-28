'use strict'

const test = require('tape')
const inject = require('shot').inject
const partialRight = require('ap').partialRight
const json = require('send-json')
const Swole = require('./')
const fixtures = require('./fixtures')

test('basic success', function (t) {
  t.plan(3)

  const router = Swole(fixtures.basic, {
    handlers: {
      basic: function (req, res, callback) {
        t.deepEqual(req.params, {id: 123}, 'receives parsed params')
        json(res, {id: 123})
        callback()
      }
    }
  })

  inject(partialRight(router, (err) => err && t.end(err)), {url: '/users/123'}, function (response) {
    t.equal(response.statusCode, 200, 'responds with 200')
    t.deepEqual(JSON.parse(response.payload), {
      id: 123
    }, 'responds with {id: Number}')
  })
})
