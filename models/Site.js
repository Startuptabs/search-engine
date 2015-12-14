"use strict"
const mongoose = require('mongoose'),
  Schema = mongoose.Schema


const Path = new Schema({
  path: {type: String, unique: true},
  title: {type: String},
  description: {type: String},
  content: {
    links: [],
    headers: [],
    paragraphs: []
  }
})

const Site = new Schema({
  domain: {type: String, unique: true},
  paths: [Path],
})

module.exports = mongoose.model('Site', Site)