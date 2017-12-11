const db = require('../service/mongoose')
module.exports = {
  repoRunner: db.model('repoRunner', require('./repo-runner'))
}
