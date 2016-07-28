'use strict'

const bulk = require('bulk-require')

module.exports = bulk(__dirname, '*.json')
