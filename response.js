'use strict'

const DelayedResponse = require('delayed-response')

module.exports = {
  wrap: wrap
}

function wrap (req, res, validate) {
  if (!validate) return res
  return DelayedResponse(req, res, validate)
}
