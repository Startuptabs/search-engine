"use strict"
const mongoose = require('mongoose'),
  Schema = mongoose.Schema


const Path = new Schema({
  path: {type: String},
  title: {type: String},
  description: {type: String},
  content: {
    links: [{type: String, index: true}],
    headers: [],
    paragraphs: []
  },
  created_at: {type: Date, default: Date.now }
})

const Site = new Schema({
  domain: {type: String, unique: true},
  paths: [Path],
  updated_at: {type: Date, default: Date.now, index: true },
  created_at: {type: Date, default: Date.now, index: true },
  blacklist: {type: Boolean, default: false}
})

Site.pre('save', function(next){
  if(this.modified) this.updated_at = Date.now()

  next()
})

module.exports = mongoose.model('Site', Site)