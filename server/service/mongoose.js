'use strict'
const fs = require('fs')
const config = require('config')
const mongoose = require('mongoose')
mongoose.Promise = Promise
function getMongoConnectionOptions () {
  const options = {useMongoClient: true}
  if (config.MONGODB.USE_SSL) {
    options.sslValidate = false
    options.checkServerIdentity = false
    options.sslKey = fs.readFileSync(config.MONGODB.KEY_PATH)
    options.sslCert = [fs.readFileSync(config.MONGODB.CERT_PATH)]
    options.sslCA = [fs.readFileSync(config.MONGODB.CA_PATH)]
  }
  return options
}

module.exports = mongoose.createConnection(config.MONGODB.URL, getMongoConnectionOptions())
