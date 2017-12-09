const session = require('koa-session')
module.exports = (app, options) => {
  return session({
    signed: false
  }, app)
}
