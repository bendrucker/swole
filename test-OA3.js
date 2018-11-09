'use strict'

const test = require('tape')
const inject = require('shot').inject
const partialRight = require('ap').partialRight
const json = require('send-json')
const extend = require('xtend')
const querystring = require('querystring')
const Swole = require('./')
const fixtures = require('./fixtures')

test('200 get', function (t) {
  t.plan(3)

  const router = Swole(fixtures['basic_OA3'], {
    handlers: {
      get: function (req, res, callback) {
        t.deepEqual(req.params, {user_id: 123}, 'receives parsed params')
        json(res, {id: 123})
        callback()
      },
      post: t.fail.bind(t)
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

  const router = Swole(fixtures['basic_OA3'], {
    handlers: {
      get: t.fail.bind(t),
      post: function (req, res, callback) {
        t.deepEqual(req.body, {id: 123, active: true}, 'receives parsed body')
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

  const router = Swole(fixtures['basic_OA3'], {
    handlers: {
      get: function (req, res, callback) {
        t.fail('handler should not be called')
      },
      post: t.fail.bind(t)
    }
  })

  inject(partialRight(router, onError), {url: '/users/boop'}, t.fail.bind('no response'))

  function onError (err) {
    t.ok(err, 'returns error')
    t.equal(err.statusCode, 400, 'sets 400 status code')
    t.equal(err.type, 'request.validation')
    t.equal(err.message, 'Invalid data in parameters: /path/user_id should be integer')
  }
})

test('400 post', function (t) {
  t.plan(6)

  const router = Swole(fixtures['basic_OA3'], {
    strict: true,
    handlers: {
      get: t.fail.bind(t),
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
    t.equal(err.message, 'Invalid data in body: /id should be integer')
    t.ok(err.errors)
    t.equal(err.errors[0].data, 'abc')
  }
})

test('400 post - root', function (t) {
  t.plan(5)

  const router = Swole(fixtures['basic_OA3'], {
    strict: true,
    handlers: {
      get: t.fail.bind(t),
      post: function (req, res, callback) {
        t.fail('handler should not be called')
      }
    }
  })

  const options = {
    method: 'post',
    url: '/users',
    payload: undefined,
    headers: {
      'content-type': 'application/json'
    }
  }

  inject(partialRight(router, onError), options, t.fail.bind('no response'))

  function onError (err) {
    t.ok(err, 'returns error')
    t.equal(err.statusCode, 400, 'sets 400 status code')
    t.equal(err.type, 'request.validation')
    t.equal(err.message, 'Invalid data in body: should have required property \'id\'')
    t.ok(err.errors)
  }
})

test('410 get', function (t) {
  t.plan(3)

  const router = Swole(fixtures['basic_OA3'], {
    strict: true,
    handlers: {
      get: t.fail.bind(t),
      post: t.fail.bind(t)
    }
  })

  const options = {
    method: 'get',
    url: '/deprecated'
  }

  inject(partialRight(router, onError), options, t.fail.bind('no response'))

  function onError (err) {
    t.ok(err, 'returns error')
    t.equal(err.statusCode, 410, 'sets 410 status code')
    t.equal(err.type, 'request.deprecated')
  }
})

test('appends `swole` data to req', function (t) {
  t.plan(5)

  const router = Swole(fixtures['basic_OA3'], {
    handlers: {
      get: function (req, res, callback) {
        t.ok(req.swole)
        t.equal(req.swole.path, '/users/{user_id}')
        t.ok(req.swole.operation)

        json(res, {id: 123})
        callback()
      },
      post: t.fail.bind(t)
    }
  })

  inject(partialRight(router, (err) => err && t.end(err)), {url: '/users/123'}, function (response) {
    t.equal(response.statusCode, 200, 'responds with 200')
    t.deepEqual(JSON.parse(response.payload), {
      id: 123
    }, 'responds with {id: Number}')
  })
})

test('pre-handler hooks', function (t) {
  t.plan(4)

  const router = Swole(fixtures['basic_OA3'], {
    handlers: {
      get: function (req, res, callback) {
        t.deepEqual(req.params, {user_id: 123}, 'receives parsed params')
        json(res, {id: 123})
        callback()
      },
      post: t.fail.bind(t)
    },
    hooks: [hook]
  })

  inject(partialRight(router, (err) => err && t.end(err)), {url: '/users/123'}, function (response) {
    t.equal(response.statusCode, 200, 'responds with 200')
    t.deepEqual(JSON.parse(response.payload), {
      id: 123
    }, 'responds with {id: Number}')
  })

  function hook (req, res, callback) {
    t.ok(req.params)
    callback()
  }
})

test('custom parser', function (t) {
  t.plan(4)

  t.throws(Swole.bind(null, fixtures['basic_OA3'], {accepts: ['lemons']}), /invalid/)

  const router = Swole(fixtures['basic_OA3'], {
    handlers: {
      get: t.fail.bind(t),
      post: function (req, res, callback) {
        t.deepEqual(req.body, {id: 123, active: true}, 'receives parsed body')
        json(res, {id: 123})
        callback()
      }
    },
    accepts: [
      'json',
      ['urlencoded', {extended: false}]
    ]
  })

  const options = {
    method: 'post',
    url: '/users',
    payload: querystring.stringify({id: 123}),
    headers: {
      'content-type': 'application/x-www-form-urlencoded'
    }
  }

  inject(partialRight(router, (err) => err && t.end(err)), options, function (response) {
    t.equal(response.statusCode, 200, 'responds with 200')
    t.deepEqual(JSON.parse(response.payload), {
      id: 123
    }, 'responds with {id: Number}')
  })
})

test('valid response', function (t) {
  t.plan(2)

  const router = Swole(fixtures['basic_OA3'], {
    strict: true,
    handlers: {
      get: t.fail.bind(t),
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

  const router = Swole(fixtures['basic_OA3'], {
    strict: true,
    handlers: {
      get: t.fail.bind(t),
      post: function (req, res, callback) {
        res.once('error', callback)
        res.writeHead(200)
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

  const router = Swole(fixtures['basic_OA3'], {
    strict: true,
    handlers: {
      get: t.fail.bind(t),
      post: function (req, res, callback) {
        res.once('error', callback)
        res.write(Buffer.from(JSON.stringify({
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
  t.plan(6)

  const router = Swole(fixtures['basic_OA3'], {
    strict: true,
    handlers: {
      get: t.fail.bind(t),
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
    t.equal(err.message, 'Invalid data in response: /id should be integer')
    t.ok(err.errors)
    t.equal(err.errors[0].data, 'abc')
  }
})

test('invalid response: bad data', function (t) {
  t.plan(3)

  const router = Swole(fixtures['basic_OA3'], {
    strict: true,
    handlers: {
      get: t.fail.bind(t),
      post: function (req, res, callback) {
        res.once('error', callback)
        res.setHeader('content-type', 'application/json')
        res.end('{foo: bar}')
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
    t.equal(err.name, 'ResponseValidationError')
    t.ok(/Invalid JSON/.test(err.message))
  }
})

test('unexpected status', function (t) {
  t.plan(5)

  const router = Swole(fixtures['basic_OA3'], {
    strict: true,
    handlers: {
      get: t.fail.bind(t),
      post: function (req, res, callback) {
        res.setHeader('beep', 'boop')
        t.equal(res.getHeader('beep'), 'boop', 'can getHeader')
        res.removeHeader('beep')
        t.notOk(res.getHeader('beep'), 'can removeHeader')
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

  inject(partialRight(router, onError), options, t.fail.bind(t, 'no response'))

  function onError (err) {
    t.ok(err, 'returns error')
    t.equal(err.type, 'response.status')
    t.equal(err.message, 'Unexpected response status: 451')
  }
})

test('unexpected status: ignores 500+', function (t) {
  t.plan(1)

  const router = Swole(fixtures['basic_OA3'], {
    strict: true,
    handlers: {
      get: t.fail.bind(t),
      post: function (req, res, callback) {
        res.once('error', callback)
        res.statusCode = 500
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
    t.equal(response.statusCode, 500)
  })
})

test('basePath', function (t) {
  t.plan(1)

  const router = Swole(extend(fixtures['basic_OA3'], {basePath: '/boop'}), {
    handlers: {
      get: t.fail.bind(t),
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

  const router = Swole(fixtures['basic_OA3'], {
    handlers: {
      get: function (req, res, callback) {
        res.end()
      },
      post: t.fail.bind(t)
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

test('file', function (t) {
  t.plan(1)

  const router = Swole(fixtures['basic_OA3'], {
    strict: true,
    handlers: {
      get: function (req, res, callback) {
        res.end()
      },
      post: t.fail.bind(t)
    }
  })

  const options = {
    method: 'get',
    url: '/file'
  }

  inject(partialRight(router, (err) => err && t.end(err)), options, function (response) {
    t.equal(response.statusCode, 200)
  })
})

test('case insensitive (default)', function (t) {
  t.plan(1)

  const router = Swole(fixtures['basic_OA3'], {
    handlers: {
      get: function (req, res, callback) {
        res.end()
      },
      post: t.fail.bind(t)
    }
  })

  const options = {
    method: 'get',
    url: '/casedroute'
  }

  inject(partialRight(router, (err) => err && t.end(err)), options, function (response) {
    t.equal(response.statusCode, 200)
  })
})

test('case sensitive', function (t) {
  t.plan(1)

  const router = Swole(fixtures['basic_OA3'], {
    lowercase: false,
    handlers: {
      get: function (req, res, callback) {
        res.end()
      },
      post: t.fail.bind(t)
    }
  })

  const options = {
    method: 'get',
    url: '/casedroute'
  }

  inject(partialRight(router, (err) => t.equal(err.statusCode, 404)), options, t.fail)
})

test('throws with missing handler', function (t) {
  t.throws(Swole.bind(null, fixtures['basic_OA3'], {
    handlers: {
      get: function (req, res, callback) {
        res.end()
      }
    }
  }), /invalid x-handler/)

  t.end()
})

test('throws when keywords are used as siblings of $ref', function (t) {
  const schema = {
    swagger: '2.0',
    info: {
      title: 'API'
    },
    paths: {
      '/foo': {
        post: {
          'x-handler': 'get',
          parameters: [
            {
              name: 'user',
              in: 'body',
              schema: {
                $ref: '#/',
                minimum: 0
              }
            }
          ],
          responses: {
            200: {
              description: 'OK'
            }
          }
        }
      }
    }
  }

  t.throws(Swole.bind(null, schema, {
    handlers: {
      get: function (req, res, callback) {
        res.end()
      }
    }
  }), /ref: validation keywords/)

  t.end()
})

test('throws when unknown json schema formats are used', function (t) {
  const schema = {
    swagger: '2.0',
    info: {
      title: 'API'
    },
    paths: {
      '/foo': {
        post: {
          'x-handler': 'get',
          parameters: [
            {
              name: 'user',
              in: 'body',
              schema: {
                format: 'great'
              }
            }
          ],
          responses: {
            200: {
              description: 'OK'
            }
          }
        }
      }
    }
  }

  t.throws(Swole.bind(null, schema, {
    handlers: {
      get: function (req, res, callback) {
        res.end()
      }
    }
  }), /unknown format/)

  t.end()
})
