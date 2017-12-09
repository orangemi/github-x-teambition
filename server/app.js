const Koa = require('koa')
const config = require('config')

const router = require('./api')
const logger = require('./service/logger')
const session = require('./service/session')

const app = new Koa()
app.use(session(app))
app.use(logger())
app.use(router.routes())
app.listen(config.PORT, () => {
  console.log(`start listen ${config.PORT} ...`)
})
