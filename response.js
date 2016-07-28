'use strict'

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
    write: function (chunk) {
      chunks.push(chunk)
      return write(chunk)
    },
    end: function validateAndEnd (chunk, enc, callback) {
      if (chunk) chunks.push(chunk)
      const buffer = Buffer.concat(chunks.map(Buffer.from))
      validate(res, JSON.parse(buffer), function (err) {
        if (err) return res.emit('error', err)
        end(buffer, enc, callback)
      })
    }
  })
}
