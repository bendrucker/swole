'use strict'

const inherits = require('util').inherits
const http = require('http')
const toBuffer = require('to-buffer')

module.exports = {
  wrap: wrap
}

function wrap (req, res, validate) {
  if (!validate) return res
  return new ValidatedResponse(req, res, validate)
}

function ValidatedResponse (req, res, validate) {
  this.validate = validate
  this.res = res
  this.buffer = []
  this.queue = []
  http.ServerResponse.call(this, {
    method: req.method,
    httpVersionMajor: 1,
    httpVersionMinor: 1
  })
}

inherits(ValidatedResponse, http.ServerResponse)

ValidatedResponse.prototype.getHeader = function getHeader () {
  return this.res.getHeader.apply(this.res, arguments)
}

ValidatedResponse.prototype.setHeader = function setHeader () {
  this.queue.push(['setHeader', arguments])
  return this.res.setHeader.apply(this.res, arguments)
}

ValidatedResponse.prototype.removeHeader = function removeHeader () {
  return this.res.removeHeader.apply(this.res, arguments)
}

ValidatedResponse.prototype.writeHead = function writeHead () {
  this.queue.push(['writeHead', arguments])
}

ValidatedResponse.prototype.write = function write (chunk) {
  this.buffer.push(chunk)
  this.queue.push(['write', arguments])
}

ValidatedResponse.prototype.end = function end (chunk) {
  if (chunk) this.buffer.push(chunk)
  this.queue.push(['end', arguments])
  flush(this)
}

function flush (response) {
  const data = Buffer.concat(response.buffer.map(toBuffer))
  const res = response.res
  response.buffer = null
  response.validate(response, JSON.parse(data), function onValidate (err) {
    if (err) {
      while (response.queue.length) {
        const call = response.queue.shift()
        if (call[0] === 'setHeader') {
          res.removeHeader(call[1][0])
        }
      }

      return response.emit('error', err)
    }

    res.statusCode = response.statusCode

    while (response.queue.length) {
      const call = response.queue.shift()
      res[call[0]].apply(res, call[1])
    }
  })
}
