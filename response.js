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
  const end = res.end.bind(res)
  return Object.assign(res, {
    write: (chunk) => chunks.push(chunk),
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
