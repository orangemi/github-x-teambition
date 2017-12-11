const {Schema} = require('mongoose')
const {ObjectId} = Schema.Types
module.exports = new Schema({
  owner: String,
  repo: String,
  events: [String],
  hookId: Number,
  organizationId: {type: ObjectId}
})
