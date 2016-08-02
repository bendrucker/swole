'use strict'

const test = require('tape')
const inject = require('shot').inject
const partialRight = require('ap').partialRight
const json = require('send-json')
const extend = require('xtend')
const Swole = require('./')
const fixtures = require('./fixtures')

test('200 get', function (t) {
  t.plan(3)

  const router = Swole(fixtures.basic, {
    handlers: {
      get: function (req, res, callback) {
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

test('200 post', function (t) {
  t.plan(3)

  const router = Swole(fixtures.basic, {
    handlers: {
      post: function (req, res, callback) {
        t.deepEqual(req.body, {id: 123}, 'receives parsed body')
        json(res, {id: 123})
        callback()
      }
    }
  })

  const options = {
    method: 'post',
    url: '/users',
    payload: JSON.stringify({id: 123}),
    headers: {
      'content-type': 'application/json'
    }
  }

  inject(partialRight(router, (err) => err && t.end(err)), options, function (response) {
    t.equal(response.statusCode, 200, 'responds with 200')
    t.deepEqual(JSON.parse(response.payload), {
      id: 123
    }, 'responds with {id: Number}')
  })
})

test('400 get', function (t) {
  t.plan(4)

  const router = Swole(fixtures.basic, {
    handlers: {
      get: function (req, res, callback) {
        t.fail('handler should not be called')
      }
    }
  })

  inject(partialRight(router, onError), {url: '/users/boop'}, t.fail.bind('no response'))

  function onError (err) {
    t.ok(err, 'returns error')
    t.equal(err.statusCode, 400, 'sets 400 status code')
    t.equal(err.type, 'request.validation')
    t.equal(err.message, 'Invalid data in parameters: path.id should be integer')
  }
})

test('400 post', function (t) {
  t.plan(4)

  const router = Swole(fixtures.basic, {
    handlers: {
      post: function (req, res, callback) {
        t.fail('handler should not be called')
      }
    }
  })

  const options = {
    method: 'post',
    url: '/users',
    payload: JSON.stringify({id: 'abc'}),
    headers: {
      'content-type': 'application/json'
    }
  }

  inject(partialRight(router, onError), options, t.fail.bind('no response'))

  function onError (err) {
    t.ok(err, 'returns error')
    t.equal(err.statusCode, 400, 'sets 400 status code')
    t.equal(err.type, 'request.validation')
    t.equal(err.message, 'Invalid data in body: id should be integer')
  }
})

test('valid response', function (t) {
  t.plan(2)

  const router = Swole(fixtures.basic, {
    strict: true,
    handlers: {
      post: function (req, res, callback) {
        res.once('error', callback)
        json(res, {
          id: 123
        })
      }
    }
  })

  const options = {
    method: 'post',
    url: '/users',
    payload: JSON.stringify({id: 123}),
    headers: {
      'content-type': 'application/json'
    }
  }

  inject(partialRight(router, (err) => err && t.end(err)), options, function (response) {
    t.equal(response.statusCode, 200)
    t.deepEqual(JSON.parse(response.payload), {id: 123})
  })
})

test('valid response: no end chunk', function (t) {
  t.plan(2)

  const router = Swole(fixtures.basic, {
    strict: true,
    handlers: {
      post: function (req, res, callback) {
        res.once('error', callback)
        res.write(JSON.stringify({
          id: 123
        }))
        res.end()
      }
    }
  })

  const options = {
    method: 'post',
    url: '/users',
    payload: JSON.stringify({id: 123}),
    headers: {
      'content-type': 'application/json'
    }
  }

  inject(partialRight(router, (err) => err && t.end(err)), options, function (response) {
    t.equal(response.statusCode, 200)
    t.deepEqual(JSON.parse(response.payload), {id: 123})
  })
})

test('valid response: buffers', function (t) {
  t.plan(2)

  const router = Swole(fixtures.basic, {
    strict: true,
    handlers: {
      post: function (req, res, callback) {
        res.once('error', callback)
        res.write(new Buffer(JSON.stringify({
          id: 123
        })))
        res.end()
      }
    }
  })

  const options = {
    method: 'post',
    url: '/users',
    payload: JSON.stringify({id: 123}),
    headers: {
      'content-type': 'application/json'
    }
  }

  inject(partialRight(router, (err) => err && t.end(err)), options, function (response) {
    t.equal(response.statusCode, 200)
    t.deepEqual(JSON.parse(response.payload), {id: 123})
  })
})

test('invalid response', function (t) {
  t.plan(4)

  const router = Swole(fixtures.basic, {
    strict: true,
    handlers: {
      post: function (req, res, callback) {
        res.once('error', callback)
        json(res, {
          id: 'abc'
        })
      }
    }
  })

  const options = {
    method: 'post',
    url: '/users',
    payload: JSON.stringify({id: 123}),
    headers: {
      'content-type': 'application/json'
    }
  }

  inject(partialRight(router, onError), options, t.fail.bind('no response'))

  function onError (err) {
    t.ok(err, 'returns error')
    t.equal(err.statusCode, 500, 'sets 500 status code')
    t.equal(err.type, 'response.validation')
    t.equal(err.message, 'Invalid data in response: id should be integer')
  }
})

test('unexpected status', function (t) {
  t.plan(3)

  const router = Swole(fixtures.basic, {
    strict: true,
    handlers: {
      post: function (req, res, callback) {
        res.once('error', callback)
        res.statusCode = 451
        json(res, {
          id: 123
        })
      }
    }
  })

  const options = {
    method: 'post',
    url: '/users',
    payload: JSON.stringify({id: 123}),
    headers: {
      'content-type': 'application/json'
    }
  }

  inject(partialRight(router, onError), options, t.fail.bind('no response'))

  function onError (err) {
    t.ok(err, 'returns error')
    t.equal(err.type, 'response.status')
    t.equal(err.message, 'Unexpected response status: 451')
  }
})

test('basePath', function (t) {
  t.plan(1)

  const router = Swole(extend(fixtures.basic, {basePath: '/boop'}), {
    handlers: {
      post: function (req, res, callback) {
        res.end()
      }
    }
  })

  const options = {
    method: 'post',
    url: '/boop/users',
    payload: JSON.stringify({id: 123}),
    headers: {
      'content-type': 'application/json'
    }
  }

  inject(partialRight(router, (err) => err && t.end(err)), options, function (response) {
    t.equal(response.statusCode, 200)
  })
})

test('no parameters', function (t) {
  t.plan(1)

  const router = Swole(fixtures.basic, {
    handlers: {
      get: function (req, res, callback) {
        res.end()
      }
    }
  })

  const options = {
    method: 'get',
    url: '/paramless'
  }

  inject(partialRight(router, (err) => err && t.end(err)), options, function (response) {
    t.equal(response.statusCode, 200)
  })
})
