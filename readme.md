# swole [![Build Status](https://travis-ci.org/bendrucker/swole.svg?branch=master)](https://travis-ci.org/bendrucker/swole)

> HTTP request router for [Swagger/OpenAPI](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md)

Swole is a configuration oriented router that glues your [Swagger API](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md) definition to request handlers without any framework dependencies. Swole uses your API definition to handle parsing/validation of user inputs and can even validate responses.

## Install

```
$ npm install --save swole
```


## Usage

```js
var Swole = require('swole')
var api = {
  swagger: '2.0',
  info: {
    title: 'API'
  },
  paths: {
    '/beep': {
      get: {
        'x-handler': 'beep',
        responses: {
          200: {
            schema: {
              type: 'string',
              enum: ['boop']
            }
          }
        }
      }
    }
  }
}

var swole = Swole(api, {
  handlers: {
    beep: (req, res, callback) => res.end('boop', callback)
  }  
})

server.on('request', function (req, res) {
  swole(req, res, function (err) {
    if (err) {
      res.statusCode = err.statusCode || 500
      return res.end(JSON.stringify(err))
    }
  })
})
```

And make a request:

```
GET /beep
#=> 200 boop
```

## API

#### `Swole(swagger, options)` -> `function`

Creates a new Swole API handler using a [Swagger](https://github.com/OAI/OpenAPI-Specification) definition and options.

Returns a `req, res, callback` middleware function.

##### swagger

*Required*  
Type: `object`

A Swagger API definition object.

##### options

###### handlers

*Required*  
Type: `object{function}`

An object containing `req, res, callback` handler functions that match to `x-handler` keys in your [operations objects](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#operationObject).

###### hooks

Type: `array[function]`

An array of `req, res, callback` handler functions that will be called in series before executing handlers. These functions are run after the parameters for the request have been parsed and validated. 

###### accepts

Type: `array[string]`  
Default: `['json']`

A list of [body parsers](https://github.com/expressjs/body-parser) to use for parsing request streams.

###### strict

Type: `boolean`  
Default: `false`

In `strict` mode, swole will validate *outgoing* payloads in addition to incoming data. This is slow and expensive and should only be used for development/debugging.

###### lowercase

Type: `boolean`  
Default: `true`

By default, Swole coerces paths into lowercase for simplicity. In practice, this makes everything but your path parameters case insensitive. To make routing case sensitive, set this to `false`.


## License

MIT © [Ben Drucker](http://bendrucker.me)
