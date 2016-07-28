'use strict'

const ServerResponse = require('http').ServerResponse

module.exports = {
  wrap: wrap
}

function wrap (validate, res) {
  if (!validate) return res
  return ValidatedResponse(validate, res)
}

function ValidatedResponse (validate, res) {
  const chunks = []
  const write = res.write.bind(res)
  const end = res.end.bind(res)
  return Object.assign(res, {
    write: function copyWrite (chunk, enc, callback) {
      if (write(chunk, enc, callback) === false) return
      chunks.push(chunk)
    },
    end: function validateAndEnd (chunk, enc, callback) {
      validate(JSON.parse(Buffer.concat(chunks)), function (err) {
        if (err) res.emit('error', err)
        end(chunk, enc, callback)
      })
    }
  })
}
